// Preview mode: the real screens running on sample data, with no PayPal or AI calls.
// Turned on at build time with VITE_MOCK=1. State lives in memory and resets on reload.
import type { Account, ListingDraft, Me, Order, OrderDetail, OrderStatus, SlipResult, Tracker } from './api'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()
const ago = (h: number) => new Date(now - h * 3600_000).toISOString()

// Sample product photos for the preview, supplied by the shop owner (public/sample).
// A listing has one photo, so every scarf order shows it whatever colour the buyer chose.
const scarf = '/sample/paisley-scarf.jpg'
const diya = '/sample/lotus-diya.jpg'
const tote = '/sample/jute-tote.jpg'

let orders: OrderDetail[] = [
  {
    id: '0AY2418885929025Y', listing_id: 'lst_scarf', capture_id: '0B495248659291430', status: 'PAID',
    amount: '26.00', currency: 'USD', variant: 'Slate blue', title: 'Block-print paisley scarf', photo_key: scarf,
    buyer_country: 'US', buyer_account_status: 'VERIFIED', ship_name: 'Jerry Maguire', ship_line1: '2211 N First St',
    ship_line2: null, ship_city: 'San Jose', ship_state: 'CA', ship_postcode: '95131', ship_country: 'US',
    seller_protection: 'ELIGIBLE', paid_at: ago(2), shipped_at: null, trackers: [],
  },
  {
    id: '7DD18315GK263354G', listing_id: 'lst_scarf2', capture_id: '5JM416817X145951N', status: 'PROTECTED',
    amount: '24.00', currency: 'USD', variant: 'Indigo', title: 'Block-print paisley scarf', photo_key: scarf,
    buyer_country: 'DE', buyer_account_status: 'VERIFIED', ship_name: 'M. Schneider', ship_line1: 'Torstrasse 101',
    ship_line2: null, ship_city: 'Berlin', ship_state: null, ship_postcode: '10119', ship_country: 'DE',
    seller_protection: 'ELIGIBLE', paid_at: ago(26), shipped_at: ago(20), tracking_number: 'EE482913507IN',
    trackers: [{ id: '5JM416817X145951N-EE482913507IN', tracking_number: 'EE482913507IN', carrier: 'INDIA_POST_INT', status: 'SHIPPED', created_at: ago(20), checks: {} }],
  },
  {
    id: '3HJ288433F935922A', listing_id: 'lst_scarf', capture_id: '3HJ288433F935922B', status: 'NEEDS_REFUND',
    amount: '26.00', currency: 'USD', variant: 'Slate blue', title: 'Block-print paisley scarf', photo_key: scarf,
    buyer_country: 'GB', buyer_account_status: 'VERIFIED', ship_name: 'A. Patel', ship_line1: '12 Brick Lane',
    ship_line2: null, ship_city: 'London', ship_state: null, ship_postcode: 'E1 6RF', ship_country: 'GB',
    seller_protection: 'ELIGIBLE', paid_at: ago(1.5), shipped_at: null, trackers: [],
  },
  {
    id: '9KL55120MN0011223', listing_id: 'lst_diya', capture_id: '6RT77120MN0011224', status: 'SHIPPED',
    amount: '18.00', currency: 'USD', variant: null, title: 'Brass lotus diya, pair', photo_key: diya,
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
    amount: '38.00', currency: 'USD', variant: 'Natural', title: 'Jute tote bag', photo_key: tote,
    buyer_country: 'AU', buyer_account_status: 'VERIFIED', ship_name: 'K. Nguyen', ship_line1: '88 Smith St',
    ship_line2: null, ship_city: 'Melbourne', ship_state: 'VIC', ship_postcode: '3065', ship_country: 'AU',
    seller_protection: 'ELIGIBLE', paid_at: new Date().toISOString(), shipped_at: null, trackers: [],
  }, ...orders]
}

export const mockApi = {
  me: async (): Promise<Me> => ({ signedIn: true, seller: { id: 'demo', display_name: 'Ruchi Handblock', paypal_verified: null } }),
  logout: async () => ({ ok: true }),
  account: async (): Promise<Account> => {
    await wait(250)
    const live = orders.filter((o) => o.status !== 'REFUNDED')
    return {
      seller: { id: 'demo', display_name: 'Ruchi Handblock', paypal_verified: null, connected_at: ago(72) },
      counts: {
        active_listings: 3, orders: live.length, protected: orders.filter((o) => o.status === 'PROTECTED').length,
        paid_total: live.filter((o) => o.status !== 'NEEDS_REFUND').reduce((s, o) => s + Number(o.amount), 0),
      },
      last_webhook: { received_at: ago(0.4), event_type: 'CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED' },
      environment: 'sandbox',
      webhook_url: 'https://shipsafe.example/webhooks/paypal',
    }
  },
  draftListing: async (photo: File): Promise<{ photo_key: string; draft: ListingDraft; ms: number }> => {
    await wait(1800)
    // The sample draft follows what was photographed, judged from the file name.
    const n = photo.name.toLowerCase()
    const draft: ListingDraft = n.includes('tote') || n.includes('bag')
      ? { title: 'Jute tote bag', description: 'Sturdy hand-stitched jute tote with soft cotton handles.', colours: ['Natural'], category: 'Bags', suggested_price_usd: 38, confidence: 0.82 }
      : n.includes('diya') || n.includes('lamp')
        ? { title: 'Brass lotus diya, pair', description: 'Pair of polished brass lotus diyas for festive light.', colours: [], category: 'Home decor', suggested_price_usd: 18, confidence: 0.84 }
        : { title: 'Block-print paisley scarf', description: 'Soft cotton scarf, hand block-printed with paisley and a tasselled edge.', colours: ['Slate blue', 'Indigo'], category: 'Scarves', suggested_price_usd: 24, confidence: 0.86 }
    return { photo_key: 'demo', draft, ms: 1800 }
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
      return { answer: 'One paid order is not protected yet: 0AY2418885929025Y, the Slate blue paisley scarf going to San Jose, US. Scan its courier slip to add tracking. The Montreal order has tracking but PayPal marks it only partially eligible.' }
    if (q.includes('ship'))
      return { answer: 'Ship 1 order today: the Slate blue paisley scarf to San Jose, CA 95131. Also refund the London buyer who paid after it sold out.' }
    if (q.includes('dispute')) return { answer: 'No open disputes on your PayPal account.' }
    return { answer: 'Your scarf is the best seller: 3 paid orders, $76 in total. The brass diya has 1 order.' }
  },
}
