// PayPal webhook handling. Probe C6: a Payment Link sale fires only
// CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED. Its transaction_id is the capture id; the capture
// links to the Orders v2 order, which carries the chosen variant.
import type { Env } from './env'
import { deleteLink, getCapture, getOrder, verifyWebhook } from './paypal'

type Ev = { id: string; event_type: string; resource: any }

export async function handleWebhook(env: Env, headers: Headers, raw: string) {
  if (!(await verifyWebhook(env, headers, raw))) return { status: 400, note: 'bad signature' }
  const ev = JSON.parse(raw) as Ev
  const seen = await env.DB.prepare('INSERT OR IGNORE INTO webhook_events (id, event_type) VALUES (?, ?)')
    .bind(ev.id, ev.event_type).run()
  if (!seen.meta.changes) return { status: 200, note: 'duplicate' }

  let note = 'ignored'
  if (ev.event_type === 'CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED') note = await onLinkPaid(env, ev.resource)
  if (ev.event_type === 'PAYMENT.CAPTURE.REFUNDED') note = await onRefunded(env, ev.resource)

  await env.DB.prepare('UPDATE webhook_events SET handled = 1, note = ? WHERE id = ?').bind(note, ev.id).run()
  return { status: 200, note }
}

async function onLinkPaid(env: Env, r: any): Promise<string> {
  const captureId: string = r.transaction_id
  const plbId: string = r.payment_resource_id
  const listing = await env.DB.prepare('SELECT * FROM listings WHERE plb_id = ?').bind(plbId).first<any>()
  if (!listing) return `unknown link ${plbId}`

  const capture = await getCapture(env, captureId)
  const orderId: string | undefined = capture?.supplementary_data?.related_ids?.order_id
  if (!orderId) return `capture ${captureId} has no order id`
  const order = await getOrder(env, orderId)
  const pu = order.purchase_units?.[0] ?? {}
  const item = pu.items?.[0] ?? {}
  const variant = item.item_option_selections?.map((o: any) => o.select).join(', ') || null
  const a = pu.shipping?.address ?? r.shipping?.address ?? {}

  // Last item in stock: count this sale and close the link. A second buyer who paid in the gap
  // is marked NEEDS_REFUND so the seller can refund in one tap (probe C10).
  const sold = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM orders WHERE listing_id = ? AND status != 'REFUNDED'",
  ).bind(listing.id).first<{ n: number }>()
  const overSold = (sold?.n ?? 0) >= listing.quantity

  await env.DB.prepare(
    `INSERT OR IGNORE INTO orders (id, seller_id, listing_id, capture_id, plb_id, status, amount, currency, variant,
      buyer_payer_id, buyer_country, buyer_account_status, ship_name, ship_line1, ship_line2, ship_city, ship_state,
      ship_postcode, ship_country, seller_protection, paid_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    orderId, listing.seller_id, listing.id, captureId, plbId, overSold ? 'NEEDS_REFUND' : 'PAID',
    r.gross_amount?.value ?? capture.amount?.value, r.gross_amount?.currency_code ?? capture.amount?.currency_code,
    variant, r.payer?.payer_id ?? null, r.payer?.country_code ?? null,
    order.payment_source?.paypal?.account_status ?? null,
    pu.shipping?.name?.full_name ?? null, a.address_line_1 ?? null, a.address_line_2 ?? null,
    a.admin_area_2 ?? null, a.admin_area_1 ?? null, a.postal_code ?? null, a.country_code ?? null,
    capture.seller_protection?.status ?? null, r.transaction_time ?? new Date().toISOString(),
  ).run()

  if ((sold?.n ?? 0) + 1 >= listing.quantity) {
    await deleteLink(env, plbId)
    await env.DB.prepare("UPDATE listings SET status = 'SOLD_OUT' WHERE id = ?").bind(listing.id).run()
  }
  return overSold ? `oversold ${orderId}` : `paid ${orderId}`
}

async function onRefunded(env: Env, r: any): Promise<string> {
  const captureId = r.links?.find((l: any) => l.rel === 'up')?.href?.split('/').pop()
  if (!captureId) return 'refund without capture link'
  await env.DB.prepare("UPDATE orders SET status = 'REFUNDED', refund_id = ? WHERE capture_id = ?")
    .bind(r.id, captureId).run()
  return `refunded ${captureId}`
}
