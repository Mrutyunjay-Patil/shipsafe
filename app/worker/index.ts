import { Hono } from 'hono'
import { z } from 'zod'
import { addressMatch, carrierEnum, normaliseTracking, s10Valid } from '../shared/validators'
import { askShop } from './ask'
import { currentSeller, finishLogin, logout, requireSeller, startLogin } from './auth'
import { type AppEnv, newId } from './env'
import { addTracker, cancelTracker, createLink, deleteLink, PayPalError, refundCapture, updateLink } from './paypal'
import { describeListing, draftListing, mediaType, readSlip, uniqueColours } from './vision'
import { handleWebhook } from './webhooks'

const app = new Hono<AppEnv>()

app.onError((err, c) => {
  if (err instanceof PayPalError) {
    console.error('paypal', err.status, err.debugId, JSON.stringify(err.body))
    return c.json({ error: 'paypal', status: err.status, issue: err.issue, debug_id: err.debugId }, 502)
  }
  if (err instanceof UploadError) return c.json({ error: 'invalid', message: err.message }, 400)
  if (err instanceof z.ZodError) return c.json({ error: 'invalid', message: err.issues[0]?.message, issues: err.issues }, 400)
  console.error(err)
  return c.json({ error: 'server', message: String(err) }, 500)
})

// ---- auth ----
app.get('/auth/paypal/login', startLogin)
app.get('/auth/paypal/callback', finishLogin)
app.post('/api/logout', logout)
app.get('/api/me', async (c) => {
  const s = await currentSeller(c)
  return c.json(s ? { signedIn: true, seller: s } : { signedIn: false })
})

// ---- webhooks ----
app.post('/webhooks/paypal', async (c) => {
  const res = await handleWebhook(c.env, c.req.raw.headers, await c.req.text())
  return c.json({ note: res.note }, res.status as 200 | 400)
})

const api = new Hono<AppEnv>()
api.use('*', requireSeller)

// A plain Error subclass: Hono only hands real Errors to onError, and a hand-built zod 4 ZodError isn't one.
class UploadError extends Error {}

async function photoFrom(c: any, field: string) {
  const form = await c.req.formData().catch(() => null)
  const f = form?.get(field)
  if (!(f instanceof File)) throw new UploadError('Attach a photo.')
  if (!f.type.startsWith('image/') && !/\.(heic|heif)$/i.test(f.name)) throw new UploadError('That file is not a photo. Choose a JPG, PNG or WebP image.')
  if (f.size > 8 * 1024 * 1024) throw new UploadError('That photo is over 8 MB. Choose a smaller one.')
  return f
}

// ---- listings ----
api.post('/listings/draft', async (c) => {
  const f = await photoFrom(c, 'photo')
  const bytes = await f.arrayBuffer()
  const key = `${c.get('sellerId')}/products/${newId('img')}`
  await c.env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: f.type } })
  const draft = await draftListing(c.env, bytes, mediaType(f.type))
  return c.json({ photo_key: key, draft: draft.value, ms: draft.ms })
})

const money2 = z.string().regex(/^\d{1,5}(\.\d{1,2})?$/, 'Use a price like 24 or 24.50')
  .refine((v) => Number(v) > 0 && Number(v) <= 10000, 'Price must be more than 0 and at most 10,000')

const NewListing = z.object({
  title: z.string().min(3).max(127),
  description: z.string().min(1).max(500),
  attributes: z.array(z.object({ name: z.string().min(1).max(40), value: z.string().min(1).max(120) })).max(12).default([]),
  colours: z.array(z.string().min(1).max(40)).max(10).default([]),
  category: z.string().max(60).optional(),
  price: money2,
  quantity: z.number().int().min(1).max(100).default(1),
  photo_key: z.string().optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
})

api.post('/listings', async (c) => {
  const b = NewListing.parse(await c.req.json())
  b.colours = uniqueColours(b.colours)
  const id = newId('lst')
  const price = Number(b.price).toFixed(2)
  const details = b.attributes.map((a) => `${a.name}: ${a.value}`).join(' · ')
  const link = await createLink(c.env, {
    listingId: id, title: b.title, description: details ? `${b.description}\n${details}` : b.description, price, currency: 'USD', colours: b.colours,
    returnUrl: new URL('/thanks', c.req.url).toString(),
  })
  await c.env.DB.prepare(
    `INSERT INTO listings (id, seller_id, title, description, attributes, colours, category, price, quantity, photo_key, plb_id, plb_url, status, ai_confidence)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'ACTIVE', ?)`,
  ).bind(id, c.get('sellerId'), b.title, b.description, JSON.stringify(b.attributes), JSON.stringify(b.colours), b.category ?? null, price, b.quantity,
    b.photo_key ?? null, link.id, link.url, b.ai_confidence ?? null).run()
  return c.json({ id, plb_id: link.id, url: link.url }, 201)
})

api.post('/listings/describe', async (c) => {
  const b = z.object({
    title: z.string().min(1).max(127), category: z.string().max(60).optional(), current: z.string().max(500).optional(),
    colours: z.array(z.string().max(40)).max(10).default([]),
    attributes: z.array(z.object({ name: z.string().max(40), value: z.string().max(120) })).max(12),
  }).parse(await c.req.json())
  return c.json({ description: await describeListing(c.env, b) })
})

api.get('/listings', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM orders o WHERE o.listing_id = l.id AND o.status NOT IN ('REFUNDED', 'NEEDS_REFUND')) AS sold
     FROM listings l WHERE seller_id = ? AND status != 'ARCHIVED' ORDER BY created_at DESC`,
  ).bind(c.get('sellerId')).all()
  return c.json(rows.results.map((r: any) => ({ ...r, colours: JSON.parse(r.colours), attributes: JSON.parse(r.attributes ?? '[]') })))
})

api.get('/listings/:id', async (c) => {
  const l = await c.env.DB.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM orders o WHERE o.listing_id = l.id AND o.status NOT IN ('REFUNDED', 'NEEDS_REFUND')) AS sold
     FROM listings l WHERE l.id = ? AND l.seller_id = ?`,
  ).bind(c.req.param('id'), c.get('sellerId')).first<any>()
  if (!l) return c.json({ error: 'not_found' }, 404)
  const orders = await c.env.DB.prepare(
    `SELECT o.*, l.title, l.photo_key FROM orders o LEFT JOIN listings l ON l.id = o.listing_id
     WHERE o.listing_id = ? ORDER BY o.paid_at DESC`,
  ).bind(l.id).all()
  return c.json({ ...l, colours: JSON.parse(l.colours), attributes: JSON.parse(l.attributes ?? '[]'), orders: orders.results })
})

// Upload a replacement product photo. The listing keeps its old photo until the edit is saved,
// so a cancelled edit leaves nothing changed.
api.post('/listings/photo', async (c) => {
  const f = await photoFrom(c, 'photo')
  const key = `${c.get('sellerId')}/products/${newId('img')}`
  await c.env.PHOTOS.put(key, await f.arrayBuffer(), { httpMetadata: { contentType: f.type } })
  return c.json({ photo_key: key })
})

// Edit a listing. A live PayPal link is updated in place, so buyers see the new details on PayPal's
// page. Stock decides the link's life: raising it on a sold-out product makes a fresh link (PayPal
// deleted the old one), and lowering it to what's already sold closes the link.
api.patch('/listings/:id', async (c) => {
  const b = z.object({
    title: z.string().trim().min(3).max(127).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    price: money2.optional(),
    colours: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    quantity: z.number().int().min(1).max(100).optional(),
    attributes: z.array(z.object({ name: z.string().trim().max(40), value: z.string().trim().max(120) })).max(24).optional(),
    photo_key: z.string().max(200).optional(),
  }).parse(await c.req.json())
  const sellerId = c.get('sellerId')
  const l = await c.env.DB.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM orders o WHERE o.listing_id = l.id AND o.status NOT IN ('REFUNDED', 'NEEDS_REFUND')) AS sold
     FROM listings l WHERE l.id = ? AND l.seller_id = ?`,
  ).bind(c.req.param('id'), sellerId).first<any>()
  if (!l) return c.json({ error: 'not_found' }, 404)
  if (l.status === 'ARCHIVED') return c.json({ error: 'invalid', message: 'This link is closed. Make a new listing to sell it again.' }, 409)
  if (b.quantity !== undefined && b.quantity < l.sold) return c.json({ error: 'invalid', message: `Already sold ${l.sold}, so stock can't go below that.` }, 400)
  if (b.photo_key !== undefined && !b.photo_key.startsWith(`${sellerId}/products/`)) return c.json({ error: 'invalid', message: 'Unknown photo.' }, 400)

  // Normalise what the client sent: drop blank detail rows, merge repeated names, dedupe colours.
  const seen = new Map<string, { name: string; value: string }>()
  for (const a of b.attributes ?? JSON.parse(l.attributes ?? '[]')) {
    if (!a.name || !a.value) continue
    const k = a.name.toLowerCase()
    if (seen.has(k)) seen.get(k)!.value = `${seen.get(k)!.value}, ${a.value}`.slice(0, 120)
    else seen.set(k, { name: a.name, value: a.value })
  }
  const attributes = [...seen.values()].slice(0, 12)
  const colours = uniqueColours(b.colours ?? JSON.parse(l.colours))
  const title = b.title ?? l.title
  const description = b.description ?? l.description
  const price = b.price !== undefined ? Number(b.price).toFixed(2) : l.price
  const quantity = b.quantity ?? l.quantity
  const photoKey = b.photo_key ?? l.photo_key

  const details = attributes.map((a) => `${a.name}: ${a.value}`).join(' · ')
  const link = {
    listingId: l.id, title, description: details ? `${description}\n${details}` : description,
    price, currency: l.currency, colours, returnUrl: new URL('/thanks', c.req.url).toString(),
  }
  let status: string = l.status
  let plbId: string | null = l.plb_id
  let plbUrl: string | null = l.plb_url
  let paypal: 'updated' | 'relisted' | 'closed' | 'none' = 'none'

  const hasStock = quantity > l.sold
  if (!hasStock && status === 'ACTIVE') {
    if (plbId) await deleteLink(c.env, plbId)
    status = 'SOLD_OUT'
    paypal = 'closed'
  } else if (hasStock && (status === 'SOLD_OUT' || !plbId)) {
    // PayPal deleted the old link when the product sold out. A fresh one is the only way to sell again.
    const fresh = await createLink(c.env, link)
    plbId = fresh.id
    plbUrl = fresh.url
    status = 'ACTIVE'
    paypal = 'relisted'
  } else if (status === 'ACTIVE' && plbId) {
    try {
      await updateLink(c.env, plbId, link)
      paypal = 'updated'
    } catch (e) {
      // The link was deleted on PayPal's side. Save the edit and tell the seller the link is gone.
      if (!(e instanceof PayPalError && e.status === 404)) throw e
      status = 'SOLD_OUT'
      plbId = null
      paypal = 'closed'
    }
  }

  await c.env.DB.prepare(
    'UPDATE listings SET title = ?, description = ?, price = ?, colours = ?, quantity = ?, attributes = ?, photo_key = ?, status = ?, plb_id = ?, plb_url = ? WHERE id = ?',
  ).bind(title, description, price, JSON.stringify(colours), quantity, JSON.stringify(attributes), photoKey, status, plbId, plbUrl, l.id).run()
  if (b.photo_key && l.photo_key && b.photo_key !== l.photo_key) await c.env.PHOTOS.delete(l.photo_key).catch(() => {})
  return c.json({ ok: true, paypal, paypal_updated: paypal === 'updated', status, url: plbUrl })
})

api.delete('/listings/:id', async (c) => {
  const l = await c.env.DB.prepare('SELECT * FROM listings WHERE id = ? AND seller_id = ?')
    .bind(c.req.param('id'), c.get('sellerId')).first<any>()
  if (!l) return c.json({ error: 'not_found' }, 404)
  if (l.plb_id) await deleteLink(c.env, l.plb_id)
  await c.env.DB.prepare("UPDATE listings SET status = 'ARCHIVED' WHERE id = ?").bind(l.id).run()
  return c.json({ ok: true })
})

api.get('/photos/*', async (c) => {
  const key = c.req.path.replace('/api/photos/', '')
  if (!key.startsWith(`${c.get('sellerId')}/`)) return c.json({ error: 'not_found' }, 404)
  const obj = await c.env.PHOTOS.get(key)
  if (!obj) return c.json({ error: 'not_found' }, 404)
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'cache-control': 'private, max-age=86400' } })
})

// ---- orders ----
const ownOrder = (c: any) =>
  c.env.DB.prepare(
    `SELECT o.*, l.title, l.photo_key FROM orders o LEFT JOIN listings l ON l.id = o.listing_id WHERE o.id = ? AND o.seller_id = ?`,
  ).bind(c.req.param('id'), c.get('sellerId')).first()

api.get('/orders', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT o.*, l.title, l.photo_key,
       (SELECT tracking_number FROM trackers t WHERE t.order_id = o.id AND t.status = 'SHIPPED' ORDER BY created_at DESC LIMIT 1) AS tracking_number
     FROM orders o LEFT JOIN listings l ON l.id = o.listing_id WHERE o.seller_id = ? ORDER BY o.paid_at DESC`,
  ).bind(c.get('sellerId')).all()
  return c.json(rows.results)
})

api.get('/orders/:id', async (c) => {
  const o = await ownOrder(c)
  if (!o) return c.json({ error: 'not_found' }, 404)
  const t = await c.env.DB.prepare('SELECT * FROM trackers WHERE order_id = ? ORDER BY created_at DESC').bind(o.id).all()
  return c.json({ ...o, trackers: t.results.map((r: any) => ({ ...r, checks: JSON.parse(r.checks) })) })
})

// Step 1: read the slip and run the checks. Nothing is sent to PayPal yet.
api.post('/orders/:id/slip', async (c) => {
  const o = await ownOrder(c)
  if (!o) return c.json({ error: 'not_found' }, 404)
  const f = await photoFrom(c, 'slip')
  const bytes = await f.arrayBuffer()
  const key = `${c.get('sellerId')}/slips/${o.id}-${Date.now()}`
  await c.env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: f.type } })
  const read = await readSlip(c.env, bytes, mediaType(f.type))
  const num = normaliseTracking(read.value.tracking_number)
  const dup = await c.env.DB.prepare("SELECT order_id FROM trackers WHERE tracking_number = ? AND status = 'SHIPPED'").bind(num).first<{ order_id: string }>()
  const checks = {
    readable: read.value.readable,
    s10: s10Valid(num),
    address: addressMatch(
      { city: read.value.destination_city, postcode: read.value.destination_postcode, country: read.value.destination_country },
      { city: o.ship_city, postcode: o.ship_postcode, country: o.ship_country },
    ),
    duplicate: dup ? dup.order_id : null,
  }
  return c.json({ slip_key: key, read: { ...read.value, tracking_number: num }, carrier: carrierEnum(read.value.carrier), checks, ms: read.ms })
})

// Step 2: the seller confirms; attach the tracker to the PayPal order.
const Track = z.object({
  tracking_number: z.string().min(5).max(40),
  carrier: z.string().min(2).max(64),
  carrier_name_other: z.string().max(64).optional(),
  slip_key: z.string().optional(),
  checks: z.record(z.string(), z.unknown()).default({}),
})

api.post('/orders/:id/track', async (c) => {
  const o = await ownOrder(c)
  if (!o) return c.json({ error: 'not_found' }, 404)
  const b = Track.parse(await c.req.json())
  const num = normaliseTracking(b.tracking_number)
  const res = await addTracker(c.env, o.id, {
    captureId: o.capture_id, trackingNumber: num, carrier: b.carrier, carrierNameOther: b.carrier_name_other,
    item: { name: o.title ?? 'Item', sku: o.listing_id ?? undefined },
  })
  const trackers = (res.purchase_units ?? []).flatMap((pu: any) => pu.shipping?.trackers ?? [])
  const t = trackers.find((x: any) => x.id?.endsWith(`-${num}`)) ?? { id: `${o.capture_id}-${num}`, status: 'SHIPPED' }
  await c.env.DB.prepare(
    `INSERT INTO trackers (id, order_id, tracking_number, carrier, status, slip_key, checks) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
  ).bind(t.id, o.id, num, b.carrier, t.status, b.slip_key ?? null, JSON.stringify(b.checks)).run()
  const status = o.seller_protection === 'ELIGIBLE' ? 'PROTECTED' : 'SHIPPED'
  await c.env.DB.prepare('UPDATE orders SET status = ?, shipped_at = COALESCE(shipped_at, ?) WHERE id = ?')
    .bind(status, new Date().toISOString(), o.id).run()
  return c.json({ tracker_id: t.id, status })
})

api.post('/orders/:id/trackers/:tid/cancel', async (c) => {
  const o = await ownOrder(c)
  if (!o) return c.json({ error: 'not_found' }, 404)
  await cancelTracker(c.env, o.id, c.req.param('tid'))
  await c.env.DB.prepare("UPDATE trackers SET status = 'CANCELLED' WHERE id = ? AND order_id = ?").bind(c.req.param('tid'), o.id).run()
  const left = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM trackers WHERE order_id = ? AND status = 'SHIPPED'").bind(o.id).first<{ n: number }>()
  if (!left?.n) await c.env.DB.prepare("UPDATE orders SET status = 'PAID' WHERE id = ?").bind(o.id).run()
  return c.json({ ok: true })
})

api.post('/orders/:id/refund', async (c) => {
  const o = await ownOrder(c)
  if (!o) return c.json({ error: 'not_found' }, 404)
  const r = await refundCapture(c.env, o.capture_id, 'Sorry, this item sold out before your payment arrived.')
  await c.env.DB.prepare("UPDATE orders SET status = 'REFUNDED', refund_id = ? WHERE id = ?").bind(r.id, o.id).run()
  return c.json({ refund_id: r.id, status: r.status })
})

// ---- account ----
api.get('/account', async (c) => {
  const id = c.get('sellerId')
  const db = c.env.DB
  const seller = await db.prepare('SELECT id, display_name, paypal_verified, connected_at FROM sellers WHERE id = ?').bind(id).first()
  const counts = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM listings WHERE seller_id = ?1 AND status = 'ACTIVE') AS active_listings,
       (SELECT COUNT(*) FROM orders WHERE seller_id = ?1 AND status != 'REFUNDED') AS orders,
       (SELECT COUNT(*) FROM orders WHERE seller_id = ?1 AND status = 'PROTECTED') AS protected,
       (SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) FROM orders WHERE seller_id = ?1 AND status NOT IN ('REFUNDED','NEEDS_REFUND')) AS paid_total`,
  ).bind(id).first()
  const hook = await db.prepare('SELECT received_at, event_type FROM webhook_events ORDER BY received_at DESC LIMIT 1').first()
  return c.json({
    seller, counts, last_webhook: hook ?? null,
    environment: c.env.PAYPAL_BASE.includes('sandbox') ? 'sandbox' : 'live',
    webhook_url: new URL('/webhooks/paypal', c.req.url).toString(),
  })
})

// ---- ask your shop ----
api.post('/ask', async (c) => {
  const { question } = z.object({ question: z.string().min(2).max(2000) }).parse(await c.req.json())
  return c.json({ answer: await askShop(c.env, c.get('sellerId'), question) })
})

app.route('/api', api)
app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404))

export default app
