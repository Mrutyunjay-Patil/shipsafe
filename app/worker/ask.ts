// "Ask your shop": Claude answers a seller's questions with tools over that seller's data only,
// and can propose changes. Every tool is bound to the signed-in seller's id from the session,
// never to anything the model or the question supplies. Proposals are not run here: the app
// shows each one as a card, and the seller's tap sends it through the normal, guarded API route.
// The PayPal MCP server needs Node and stdio, so on Workers the same read-only PayPal operations
// are called directly (probe C12 showed get_order and list_disputes are the useful ones).
import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { Env } from './env'
import { getOrder, listDisputes, pp } from './paypal'

const SYSTEM =
  "You answer a small seller's questions about their ShipSafe shop and help them act on it. Use the tools for every " +
  'fact; never guess numbers. shop_summary covers every sale; list_orders and list_listings give detail. ' +
  'An order is protected once it has a SHIPPED tracker and PayPal marks seller protection ELIGIBLE. Paid orders with ' +
  'no tracker are not protected yet; tell the seller to open the order and scan the courier slip. ' +
  'Answer in Markdown: short paragraphs, bullet lists, and tables when comparing several rows. Amounts come already formatted, such as $28.00; copy them as given and never convert or change the currency symbol. ' +
  'When the seller asks for a change, or a change clearly follows from the answer (a refund for an oversold order, ' +
  'restocking a sold-out product), call the matching propose_ tool. Proposals do nothing until the seller taps Confirm ' +
  'in the app, so say that the change is ready to confirm, never that it is done. You only see this seller\'s shop.'

export type ProposedAction =
  | { kind: 'refund'; order_id: string; summary: string }
  | { kind: 'update_listing'; listing_id: string; price?: string; quantity?: number; summary: string }
  | { kind: 'create_buyer_link'; listing_id: string; label: string; price?: string; colour?: string; expires_days?: number; summary: string }
  | { kind: 'close_buyer_link'; buyer_link_id: string; summary: string }
  | { kind: 'close_listing'; listing_id: string; summary: string }

type Turn = { role: 'user' | 'assistant'; content: string }

const money = (v: number | string, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(Number(v))
// Rows go to the model with money already formatted ("$28.00"), so it never has to pick a symbol.
const fmt = (rows: any[]) => rows.map((r) => {
  const out = { ...r }
  for (const k of ['amount', 'price', 'revenue']) if (out[k] != null && out[k] !== '') out[k] = money(out[k], out.currency)
  delete out.currency
  return out
})

export async function askShop(env: Env, sellerId: string, history: Turn[]) {
  const actions: (ProposedAction & { id: string })[] = []
  const db = env.DB
  const ownListing = (id: string) => db.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM orders o WHERE o.listing_id = l.id AND o.status NOT IN ('REFUNDED', 'NEEDS_REFUND')) AS sold
     FROM listings l WHERE l.id = ? AND l.seller_id = ?`,
  ).bind(id, sellerId).first<any>()
  const propose = (a: ProposedAction) => {
    actions.push({ ...a, id: crypto.randomUUID() })
    return `Proposed: ${a.summary}. The seller must tap Confirm in the app before anything changes.`
  }

  const shopSummary = betaZodTool({
    name: 'shop_summary',
    description: 'Totals over every order this seller has ever had: counts and revenue by status, by product, by colour and by buyer country.',
    inputSchema: z.object({}),
    run: async () => {
      const q = (sql: string) => db.prepare(sql).bind(sellerId).all().then((r) => r.results)
      return JSON.stringify({
        by_status: fmt(await q(`SELECT status, COUNT(*) AS orders, ROUND(SUM(CAST(amount AS REAL)), 2) AS amount, MAX(currency) AS currency FROM orders WHERE seller_id = ? GROUP BY status`)),
        by_product: fmt(await q(`SELECT l.id AS listing_id, l.title, COUNT(o.id) AS orders, ROUND(SUM(CASE WHEN o.status NOT IN ('REFUNDED','NEEDS_REFUND') THEN CAST(o.amount AS REAL) ELSE 0 END), 2) AS revenue, MAX(o.currency) AS currency
          FROM orders o LEFT JOIN listings l ON l.id = o.listing_id WHERE o.seller_id = ? GROUP BY l.id ORDER BY revenue DESC`)),
        by_colour: await q(`SELECT COALESCE(variant, 'One style') AS colour, COUNT(*) AS orders FROM orders WHERE seller_id = ? AND status NOT IN ('REFUNDED','NEEDS_REFUND') GROUP BY variant ORDER BY orders DESC`),
        by_country: await q(`SELECT ship_country AS country, COUNT(*) AS orders FROM orders WHERE seller_id = ? GROUP BY ship_country ORDER BY orders DESC`),
        first_and_last: await q(`SELECT MIN(paid_at) AS first_sale, MAX(paid_at) AS last_sale, COUNT(*) AS all_orders FROM orders WHERE seller_id = ?`),
      })
    },
  })
  const listOrders = betaZodTool({
    name: 'list_orders',
    description: 'List this seller\'s orders, newest first, with status, amount, colour, product, buyer city and country, tracking, seller protection and the buyer link used.',
    inputSchema: z.object({
      status: z.enum(['ANY', 'PAID', 'SHIPPED', 'PROTECTED', 'REFUNDED', 'NEEDS_REFUND']).describe('Filter by status, ANY for all'),
      listing_id: z.string().optional().describe('Only orders for this listing'),
      limit: z.number().int().min(1).max(500).default(200),
    }),
    run: async ({ status, listing_id, limit }) => {
      const rows = await db.prepare(
        `SELECT o.id, o.status, o.amount, o.currency, o.variant, o.ship_city, o.ship_country, o.seller_protection,
                o.paid_at, o.shipped_at, l.title, o.listing_id, b.label AS buyer_link,
                (SELECT tracking_number FROM trackers t WHERE t.order_id = o.id AND t.status = 'SHIPPED' LIMIT 1) AS tracking
         FROM orders o LEFT JOIN listings l ON l.id = o.listing_id LEFT JOIN buyer_links b ON b.id = o.buyer_link_id
         WHERE o.seller_id = ? AND (? = 'ANY' OR o.status = ?) AND (? IS NULL OR o.listing_id = ?)
         ORDER BY o.paid_at DESC LIMIT ?`,
      ).bind(sellerId, status, status, listing_id ?? null, listing_id ?? null, limit).all()
      return JSON.stringify(fmt(rows.results))
    },
  })
  const listListings = betaZodTool({
    name: 'list_listings',
    description: 'List this seller\'s products with id, price, stock, units sold, colours, link status and open buyer links.',
    inputSchema: z.object({}),
    run: async () => {
      const rows = await db.prepare(
        `SELECT l.id, l.title, l.price, l.currency, l.status, l.quantity, l.colours, l.plb_url,
                (SELECT COUNT(*) FROM orders o WHERE o.listing_id = l.id AND o.status NOT IN ('REFUNDED', 'NEEDS_REFUND')) AS sold,
                (SELECT COUNT(*) FROM buyer_links b WHERE b.listing_id = l.id AND b.status = 'OPEN') AS open_buyer_links
         FROM listings l WHERE l.seller_id = ? ORDER BY l.created_at DESC LIMIT 200`,
      ).bind(sellerId).all()
      return JSON.stringify(fmt(rows.results))
    },
  })
  const listBuyerLinks = betaZodTool({
    name: 'list_buyer_links',
    description: 'List this seller\'s one-buyer links with label, product, price, colour, status and expiry.',
    inputSchema: z.object({ status: z.enum(['ANY', 'OPEN', 'PAID', 'CLOSED', 'EXPIRED']) }),
    run: async ({ status }) => {
      const rows = await db.prepare(
        `SELECT b.id, b.label, b.price, b.colour, b.status, b.expires_at, l.title, b.listing_id FROM buyer_links b
         JOIN listings l ON l.id = b.listing_id WHERE b.seller_id = ? AND (? = 'ANY' OR b.status = ?) ORDER BY b.created_at DESC LIMIT 200`,
      ).bind(sellerId, status, status).all()
      return JSON.stringify(fmt(rows.results))
    },
  })
  const paypalOrder = betaZodTool({
    name: 'get_paypal_order',
    description: 'Fetch one of this seller\'s orders live from PayPal, including trackers and seller protection.',
    inputSchema: z.object({ order_id: z.string() }),
    run: async ({ order_id }) => {
      const own = await db.prepare('SELECT id FROM orders WHERE id = ? AND seller_id = ?').bind(order_id, sellerId).first()
      if (!own) return 'Not one of this seller\'s orders.'
      const o = await getOrder(env, order_id)
      const pu = o.purchase_units?.[0] ?? {}
      return JSON.stringify({
        status: o.status,
        trackers: pu.shipping?.trackers?.map((t: any) => ({ id: t.id, status: t.status })) ?? [],
        seller_protection: pu.payments?.captures?.[0]?.seller_protection?.status,
      })
    },
  })
  const disputes = betaZodTool({
    name: 'list_disputes',
    description: 'List PayPal disputes on this seller\'s orders.',
    inputSchema: z.object({}),
    run: async () => {
      // The PayPal account can hold disputes for other sellers' sales, so keep only disputes whose
      // transaction is one of this seller's captures.
      const caps = new Map(
        (await db.prepare('SELECT id, capture_id FROM orders WHERE seller_id = ?').bind(sellerId).all<{ id: string; capture_id: string }>())
          .results.map((r) => [r.capture_id, r.id]),
      )
      const items: any[] = (await listDisputes(env)).items ?? []
      const mine = []
      for (const d of items) {
        const tx = d.disputed_transactions ?? (await pp(env, 'GET', `/v1/customer/disputes/${d.dispute_id}`).catch(() => ({}))).disputed_transactions ?? []
        const hit = tx.find((t: any) => caps.has(t.seller_transaction_id))
        if (hit) mine.push({ dispute_id: d.dispute_id, order_id: caps.get(hit.seller_transaction_id), reason: d.reason, status: d.status, amount: d.dispute_amount, updated: d.update_time })
      }
      return JSON.stringify(mine)
    },
  })

  // ---- proposals: validated here, run only after the seller confirms ----
  const proposeRefund = betaZodTool({
    name: 'propose_refund',
    description: 'Propose a full refund of one of this seller\'s orders, for example an oversold NEEDS_REFUND order.',
    inputSchema: z.object({ order_id: z.string(), reason: z.string().max(200) }),
    run: async ({ order_id, reason }) => {
      const o = await db.prepare(`SELECT o.*, l.title FROM orders o LEFT JOIN listings l ON l.id = o.listing_id WHERE o.id = ? AND o.seller_id = ?`).bind(order_id, sellerId).first<any>()
      if (!o) return 'Not one of this seller\'s orders.'
      if (o.status === 'REFUNDED') return 'That order is already refunded.'
      return propose({ kind: 'refund', order_id, summary: `Refund ${money(o.amount, o.currency)} for ${o.title ?? 'the order'} to ${o.ship_city ?? 'the buyer'}, ${o.ship_country ?? ''}. ${reason}`.trim() })
    },
  })
  const proposeUpdate = betaZodTool({
    name: 'propose_listing_update',
    description: 'Propose a new price and/or stock for one of this seller\'s products. Stock can\'t go below units sold.',
    inputSchema: z.object({
      listing_id: z.string(),
      price: z.string().regex(/^\d{1,5}(\.\d{1,2})?$/).optional(),
      quantity: z.number().int().min(1).max(100).optional(),
    }),
    run: async ({ listing_id, price, quantity }) => {
      const l = await ownListing(listing_id)
      if (!l) return 'Not one of this seller\'s products.'
      if (l.status === 'ARCHIVED') return 'That product\'s link is closed; it can\'t be edited.'
      if (price === undefined && quantity === undefined) return 'Give a price or a stock level.'
      if (price !== undefined && !(Number(price) > 0 && Number(price) <= 10000)) return 'Price must be more than 0 and at most 10,000.'
      if (quantity !== undefined && quantity < l.sold) return `Already sold ${l.sold}, so stock can't go below that.`
      const parts = [price !== undefined && `price ${money(l.price, l.currency)} → ${money(price, l.currency)}`, quantity !== undefined && `stock ${l.quantity} → ${quantity}`].filter(Boolean)
      const relist = l.status === 'SOLD_OUT' && (quantity ?? l.quantity) > l.sold ? ' This makes a new PayPal link.' : ''
      return propose({ kind: 'update_listing', listing_id, price, quantity, summary: `${l.title}: ${parts.join(', ')}.${relist}` })
    },
  })
  const proposeBuyerLink = betaZodTool({
    name: 'propose_buyer_link',
    description: 'Propose a one-buyer PayPal link for one of this seller\'s products, with an optional special price and fixed colour.',
    inputSchema: z.object({
      listing_id: z.string(),
      label: z.string().min(1).max(60).describe('Who it is for, e.g. "Priya, WhatsApp"'),
      price: z.string().regex(/^\d{1,5}(\.\d{1,2})?$/).optional(),
      colour: z.string().max(40).optional(),
      expires_days: z.number().int().min(1).max(30).default(7),
    }),
    run: async ({ listing_id, label, price, colour, expires_days }) => {
      const l = await ownListing(listing_id)
      if (!l) return 'Not one of this seller\'s products.'
      if (l.status !== 'ACTIVE' || l.quantity <= l.sold) return 'That product is not on sale. Propose a stock increase first.'
      const colours: string[] = JSON.parse(l.colours)
      const c = colour ? colours.find((x) => x.toLowerCase() === colour.toLowerCase()) : undefined
      if (colour && !c) return `${colour} isn't one of its colours: ${colours.join(', ') || 'it has one style'}.`
      return propose({ kind: 'create_buyer_link', listing_id, label, price, colour: c, expires_days,
        summary: `Buyer link for ${label}: ${l.title}, ${money(price ?? l.price, l.currency)}${c ? `, ${c} only` : ''}, closes after ${expires_days} days if unpaid` })
    },
  })
  const proposeCloseBuyerLink = betaZodTool({
    name: 'propose_close_buyer_link',
    description: 'Propose closing one of this seller\'s open buyer links.',
    inputSchema: z.object({ buyer_link_id: z.string() }),
    run: async ({ buyer_link_id }) => {
      const b = await db.prepare(`SELECT b.*, l.title FROM buyer_links b JOIN listings l ON l.id = b.listing_id WHERE b.id = ? AND b.seller_id = ?`).bind(buyer_link_id, sellerId).first<any>()
      if (!b) return 'Not one of this seller\'s buyer links.'
      if (b.status !== 'OPEN') return `That link is already ${b.status.toLowerCase()}.`
      return propose({ kind: 'close_buyer_link', buyer_link_id, summary: `Close the buyer link for ${b.label} (${b.title})` })
    },
  })
  const proposeCloseListing = betaZodTool({
    name: 'propose_close_listing',
    description: 'Propose closing a product\'s PayPal link and its open buyer links for good. It can\'t be reopened.',
    inputSchema: z.object({ listing_id: z.string() }),
    run: async ({ listing_id }) => {
      const l = await ownListing(listing_id)
      if (!l) return 'Not one of this seller\'s products.'
      if (l.status === 'ARCHIVED') return 'That link is already closed.'
      return propose({ kind: 'close_listing', listing_id, summary: `Close the PayPal link for ${l.title}. Buyers can no longer pay it, and it can't be reopened` })
    },
  })

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const final = await client.beta.messages.toolRunner({
    model: env.VISION_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: 'low' },
    tools: [shopSummary, listOrders, listListings, listBuyerLinks, paypalOrder, disputes,
      proposeRefund, proposeUpdate, proposeBuyerLink, proposeCloseBuyerLink, proposeCloseListing],
    messages: history.slice(-12).map((t) => ({ role: t.role, content: t.content.slice(0, 4000) })),
    max_iterations: 8,
  })
  const answer = final.stop_reason === 'refusal'
    ? "I can't help with that one."
    : final.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
  return { answer, actions }
}
