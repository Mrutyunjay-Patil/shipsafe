// "Ask your shop": Claude answers questions using read-only tools over this seller's data and
// PayPal's GET endpoints. The PayPal MCP server needs Node and stdio, so on Workers the same
// read-only operations are exposed directly as tools (probe C12 showed get_order and
// list_disputes are the useful ones; get_shipment_tracking returns 403).
import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { Env } from './env'
import { getOrder, listDisputes } from './paypal'

const SYSTEM =
  "You answer a small seller's questions about their ShipSafe shop. Use the tools to look up facts; never guess " +
  'numbers. An order is protected once it has a SHIPPED tracker and PayPal marks seller protection ELIGIBLE. ' +
  'Paid orders with no tracker are not protected yet. Keep answers short, list order ids and buyer cities when ' +
  'useful, and say what to do next. You can only read data; you cannot change anything.'

export async function askShop(env: Env, sellerId: string, question: string) {
  const listOrders = betaZodTool({
    name: 'list_orders',
    description: 'List this seller\'s orders with status, amount, variant, buyer city and country, tracker count, and seller protection.',
    inputSchema: z.object({
      status: z.enum(['ANY', 'PAID', 'SHIPPED', 'PROTECTED', 'REFUNDED', 'NEEDS_REFUND']).describe('Filter by status, ANY for all'),
    }),
    run: async ({ status }) => {
      const rows = await env.DB.prepare(
        `SELECT o.id, o.status, o.amount, o.currency, o.variant, o.ship_city, o.ship_country, o.seller_protection,
                o.paid_at, o.shipped_at, l.title,
                (SELECT COUNT(*) FROM trackers t WHERE t.order_id = o.id AND t.status = 'SHIPPED') AS trackers
         FROM orders o LEFT JOIN listings l ON l.id = o.listing_id
         WHERE o.seller_id = ? AND (? = 'ANY' OR o.status = ?) ORDER BY o.paid_at DESC LIMIT 100`,
      ).bind(sellerId, status, status).all()
      return JSON.stringify(rows.results)
    },
  })
  const listListings = betaZodTool({
    name: 'list_listings',
    description: 'List this seller\'s listings with price, status and how many have sold.',
    inputSchema: z.object({}),
    run: async () => {
      const rows = await env.DB.prepare(
        `SELECT l.id, l.title, l.price, l.currency, l.status, l.quantity,
                (SELECT COUNT(*) FROM orders o WHERE o.listing_id = l.id AND o.status != 'REFUNDED') AS sold
         FROM listings l WHERE l.seller_id = ? ORDER BY l.created_at DESC LIMIT 100`,
      ).bind(sellerId).all()
      return JSON.stringify(rows.results)
    },
  })
  const paypalOrder = betaZodTool({
    name: 'get_paypal_order',
    description: 'Fetch one order live from PayPal, including its trackers. Only for order ids returned by list_orders.',
    inputSchema: z.object({ order_id: z.string() }),
    run: async ({ order_id }) => {
      const own = await env.DB.prepare('SELECT id FROM orders WHERE id = ? AND seller_id = ?').bind(order_id, sellerId).first()
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
    description: 'List open PayPal disputes on the account.',
    inputSchema: z.object({}),
    run: async () => JSON.stringify((await listDisputes(env)).items ?? []),
  })

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const final = await client.beta.messages.toolRunner({
    model: env.VISION_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: 'low' },
    tools: [listOrders, listListings, paypalOrder, disputes],
    messages: [{ role: 'user', content: question.slice(0, 2000) }],
    max_iterations: 6,
  })
  if (final.stop_reason === 'refusal') return 'I can\'t help with that one.'
  return final.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
}
