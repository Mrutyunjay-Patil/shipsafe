// Preview mode: the real screens running on sample data, with no PayPal or AI calls.
// Turned on at build time with VITE_MOCK=1. State lives in memory and resets on reload.
import type { ListingDraft, Me, Order, OrderDetail, OrderStatus, SlipResult, Tracker } from './api'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()
const ago = (h: number) => new Date(now - h * 3600_000).toISOString()

const scarf =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4fd8"/><stop offset="1" stop-color="#8fb8ff"/></linearGradient></defs><rect width="120" height="120" fill="url(#a)"/><path d="M20 30h80v14H20zM20 56h80v14H20zM20 82h80v14H20z" fill="#fff" opacity=".35"/></svg>`)
const rust =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#b4532a"/><circle cx="60" cy="60" r="30" fill="#f3c9a4" opacity=".55"/></svg>`)

let orders: OrderDetail[] = [
  {
    id: '0AY2418885929025Y', listing_id: 'lst_scarf', capture_id: '0B495248659291430', status: 'PAID',
    amount: '26.00', currency: 'USD', variant: 'Rust', title: 'Hand block-printed cotton scarf', photo_key: rust,
    buyer_country: 'US', buyer_account_status: 'VERIFIED', ship_name: 'Jerry Maguire', ship_line1: '2211 N First St',
    ship_line2: null, ship_city: 'San Jose', ship_state: 'CA', ship_postcode: '95131', ship_country: 'US',
    seller_protection: 'ELIGIBLE', paid_at: ago(2), shipped_at: null, trackers: [],
  },
  {
    id: '7DD18315GK263354G', listing_id: 'lst_scarf2', capture_id: '5JM416817X145951N', status: 'PROTECTED',
    amount: '24.00', currency: 'USD', variant: 'Indigo', title: 'Hand block-printed cotton scarf', photo_key: scarf,
    buyer_country: 'DE', buyer_account_status: 'VERIFIED', ship_name: 'M. Schneider', ship_line1: 'Torstrasse 101',
    ship_line2: null, ship_city: 'Berlin', ship_state: null, ship_postcode: '10119', ship_country: 'DE',
    seller_protection: 'ELIGIBLE', paid_at: ago(26), shipped_at: ago(20), tracking_number: 'EE482913507IN',
    trackers: [{ id: '5JM416817X145951N-EE482913507IN', tracking_number: 'EE482913507IN', carrier: 'INDIA_POST_INT', status: 'SHIPPED', created_at: ago(20), checks: {} }],
  },
  {
    id: '3HJ288433F935922A', listing_id: 'lst_scarf', capture_id: '3HJ288433F935922B', status: 'NEEDS_REFUND',
    amount: '26.00', currency: 'USD', variant: 'Rust', title: 'Hand block-printed cotton scarf', photo_key: rust,
    buyer_country: 'GB', buyer_account_status: 'VERIFIED', ship_name: 'A. Patel', ship_line1: '12 Brick Lane',
    ship_line2: null, ship_city: 'London', ship_state: null, ship_postcode: 'E1 6RF', ship_country: 'GB',
    seller_protection: 'ELIGIBLE', paid_at: ago(1.5), shipped_at: null, trackers: [],
  },
  {
    id: '9KL55120MN0011223', listing_id: 'lst_diya', capture_id: '6RT77120MN0011224', status: 'SHIPPED',
    amount: '18.00', currency: 'USD', variant: null, title: 'Brass diya, hand polished', photo_key: null,
    buyer_country: 'CA', buyer_account_status: 'UNVERIFIED', ship_name: 'L. Tremblay', ship_line1: '400 Rue Sherbrooke',
    ship_line2: null, ship_city: 'Montreal', ship_state: 'QC', ship_postcode: 'H3A 0B9', ship_country: 'CA',
    seller_protection: 'PARTIALLY_ELIGIBLE', paid_at: ago(50), shipped_at: ago(40), tracking_number: 'RR287043775IN',
    trackers: [{ id: '6RT77120MN0011224-RR287043775IN', tracking_number: 'RR287043775IN', carrier: 'INDIA_POST_INT', status: 'SHIPPED', created_at: ago(40), checks: {} }],
  },
]

const summary = (o: OrderDetail): Order => {
  const { trackers, ...rest } = o
  return { ...rest, tracking_number: trackers.find((t) => t.status === 'SHIPPED')?.tracking_number ?? null }
}
const find = (id: string) => {
  const o = orders.find((x) => x.id === id)
  if (!o) throw new Error('not_found')
  return o
}
const update = (id: string, patch: Partial<OrderDetail>) => {
  orders = orders.map((o) => (o.id === id ? { ...o, ...patch } : o))
}

// A new buyer pays a few seconds after the preview opens, so the arrival motion can be seen.
let arrivedAt = 0
function maybeArrive() {
  if (!arrivedAt) arrivedAt = Date.now() + 10_000
  if (Date.now() < arrivedAt || orders.some((o) => o.id === '2WX19004AB8812345')) return
  orders = [{
    id: '2WX19004AB8812345', listing_id: 'lst_bag', capture_id: '4QP81022CD7765432', status: 'PAID',
    amount: '38.00', currency: 'USD', variant: 'Mustard', title: 'Hand-stitched jute tote', photo_key: null,
    buyer_country: 'AU', buyer_account_status: 'VERIFIED', ship_name: 'K. Nguyen', ship_line1: '88 Smith St',
    ship_line2: null, ship_city: 'Melbourne', ship_state: 'VIC', ship_postcode: '3065', ship_country: 'AU',
    seller_protection: 'ELIGIBLE', paid_at: new Date().toISOString(), shipped_at: null, trackers: [],
  }, ...orders]
}

export const mockApi = {
  me: async (): Promise<Me> => ({ signedIn: true, seller: { id: 'demo', display_name: 'Ruchi Handblock', paypal_verified: null } }),
  logout: async () => ({ ok: true }),
  draftListing: async (_photo: File): Promise<{ photo_key: string; draft: ListingDraft; ms: number }> => {
    await wait(1800)
    return {
      photo_key: 'demo',
      draft: {
        title: 'Hand block-printed cotton scarf', description: 'Soft cotton scarf, hand block-printed in Jaipur with a small floral motif.',
        colours: ['Indigo', 'Rust'], category: 'Scarves', suggested_price_usd: 24, confidence: 0.86,
      },
      ms: 1800,
    }
  },
  createListing: async () => {
    await wait(1200)
    return { id: 'lst_demo', plb_id: 'PLB-DEMO1234PREV', url: 'https://www.sandbox.paypal.com/ncp/payment/PLB-DEMO1234PREV' }
  },
  listings: async () => [],
  archiveListing: async () => ({ ok: true }),
  orders: async () => { await wait(300); maybeArrive(); return orders.map(summary) },
  order: async (id: string) => { await wait(250); return find(id) },
  readSlip: async (id: string, _slip: File): Promise<SlipResult> => {
    await wait(1600)
    const o = find(id)
    return {
      slip_key: 'demo',
      read: { carrier: 'INDIA POST', tracking_number: 'EE123456785IN', destination_city: o.ship_city ?? '', destination_postcode: o.ship_postcode ?? '', destination_country: o.ship_country ?? '' },
      carrier: { carrier: 'INDIA_POST_INT' },
      checks: { readable: true, s10: true, address: { city: true, postcode: true, country: true, match: true }, duplicate: null },
      ms: 1600,
    }
  },
  track: async (id: string, b: { tracking_number: string; carrier: string }) => {
    await wait(900)
    const o = find(id)
    const t: Tracker = { id: `${o.capture_id}-${b.tracking_number}`, tracking_number: b.tracking_number, carrier: b.carrier, status: 'SHIPPED', created_at: new Date().toISOString(), checks: {} }
    const status: OrderStatus = o.seller_protection === 'ELIGIBLE' ? 'PROTECTED' : 'SHIPPED'
    update(id, { status, trackers: [t, ...o.trackers], shipped_at: new Date().toISOString() })
    return { tracker_id: t.id, status }
  },
  cancelTracker: async (id: string, tid: string) => {
    await wait(600)
    const o = find(id)
    const trackers = o.trackers.map((t) => (t.id === tid ? { ...t, status: 'CANCELLED' as const } : t))
    update(id, { trackers, status: trackers.some((t) => t.status === 'SHIPPED') ? o.status : 'PAID' })
    return { ok: true }
  },
  refund: async (id: string) => { await wait(900); update(id, { status: 'REFUNDED' }); return { refund_id: 'DEMO', status: 'COMPLETED' } },
  ask: async (question: string) => {
    await wait(1400)
    const q = question.toLowerCase()
    if (q.includes('protect'))
      return { answer: 'One paid order is not protected yet: 0AY2418885929025Y, the Rust scarf going to San Jose, US. Scan its courier slip to add tracking. The Montreal order has tracking but PayPal marks it only partially eligible.' }
    if (q.includes('ship'))
      return { answer: 'Ship 1 order today: the Rust scarf to San Jose, CA 95131. Also refund the London buyer who paid after it sold out.' }
    if (q.includes('dispute')) return { answer: 'No open disputes on your PayPal account.' }
    return { answer: 'Your scarf is the best seller: 3 paid orders, $76 in total. The brass diya has 1 order.' }
  },
}
