// Preview mode: the real screens running on sample data, with no PayPal or AI calls.
// Turned on at build time with VITE_MOCK=1. State lives in memory and resets on reload.
import type { Account, BuyerLink, ProposedAction, Listing, ListingDetail, ListingDraft, ListingPatch, ListingPatchResult, Me, Order, OrderDetail, OrderStatus, SlipResult, Tracker } from './api'

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
    id: '7DD18315GK263354G', listing_id: 'lst_scarf', capture_id: '5JM416817X145951N', status: 'PROTECTED',
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

// Two weeks of earlier sample sales, so charts and activity have history to show.
const CITIES: [string, string, string, string][] = [
  ['Toronto', 'ON', 'M5V 2T6', 'CA'], ['Amsterdam', '', '1015 CJ', 'NL'], ['Melbourne', 'VIC', '3065', 'AU'],
  ['Austin', 'TX', '78701', 'US'], ['Paris', '', '75003', 'FR'], ['Seattle', 'WA', '98101', 'US'],
  ['Dublin', '', 'D02 X285', 'IE'], ['Singapore', '', '048616', 'SG'], ['Munich', '', '80331', 'DE'],
  ['Brooklyn', 'NY', '11201', 'US'], ['Lisbon', '', '1100-148', 'PT'],
]
const history: OrderDetail[] = CITIES.map(([city, state, pc, cc], i) => {
  const kind = i % 3 === 0 ? 'diya' : i % 3 === 1 ? 'scarf' : 'tote'
  const paid = 30 + i * 28
  const n = (5566778 + i * 7).toString().padStart(8, '0')
  return {
    id: `HIST${String(i).padStart(2, '0')}SAMPLEORDER`, listing_id: kind === 'diya' ? 'lst_diya' : kind === 'scarf' ? 'lst_scarf' : 'lst_bag',
    capture_id: `HISTCAP${i}`, status: i === 4 ? 'REFUNDED' : 'PROTECTED',
    amount: kind === 'diya' ? '18.00' : kind === 'scarf' ? '26.00' : '38.00', currency: 'USD',
    variant: kind === 'scarf' ? (i % 2 ? 'Indigo' : 'Slate blue') : kind === 'tote' ? 'Natural' : null,
    title: kind === 'diya' ? 'Brass lotus diya, pair' : kind === 'scarf' ? 'Block-print paisley scarf' : 'Jute tote bag',
    photo_key: kind === 'diya' ? diya : kind === 'scarf' ? scarf : tote,
    buyer_country: cc, buyer_account_status: 'VERIFIED', ship_name: 'Sample buyer', ship_line1: '1 Sample Street', ship_line2: null,
    ship_city: city, ship_state: state || null, ship_postcode: pc, ship_country: cc, seller_protection: 'ELIGIBLE',
    paid_at: ago(paid), shipped_at: i === 4 ? null : ago(paid - 14 - (i % 4) * 5),
    trackers: i === 4 ? [] : [{ id: `HISTCAP${i}-EE${n}IN`, tracking_number: `EE${n}IN`, carrier: 'INDIA_POST_INT', status: 'SHIPPED', created_at: ago(paid - 16), checks: {} }],
  }
})
orders = [...orders, ...history]

let listings: Omit<Listing, 'sold'>[] = [
  { id: 'lst_scarf', title: 'Block-print paisley scarf', description: 'Soft cotton scarf, hand block-printed with paisley and a tasselled edge.', attributes: [{ name: 'Material', value: '100% cotton' }, { name: 'Size', value: '180 × 70 cm' }, { name: 'Print technique', value: 'Hand block print' }, { name: 'Care', value: 'Hand wash cold' }], colours: ['Slate blue', 'Indigo'], category: 'Scarves', price: '26.00', currency: 'USD', quantity: 10, photo_key: scarf, photos: [scarf], plb_id: 'PLB-5PGXCE53JB4F', plb_url: 'https://www.sandbox.paypal.com/ncp/payment/PLB-5PGXCE53JB4F', status: 'ACTIVE', created_at: ago(80) },
  { id: 'lst_diya', title: 'Brass lotus diya, pair', description: 'Pair of polished brass lotus diyas for festive light.', attributes: [{ name: 'Material', value: 'Solid brass' }, { name: 'Height', value: '7 cm' }, { name: 'Set of', value: '2' }], colours: [], category: 'Home decor', price: '18.00', currency: 'USD', quantity: 5, photo_key: diya, photos: [diya], plb_id: 'PLB-DIYA0001PREV', plb_url: 'https://www.sandbox.paypal.com/ncp/payment/PLB-DIYA0001PREV', status: 'SOLD_OUT', created_at: ago(120) },
  { id: 'lst_bag', title: 'Jute tote bag', description: 'Sturdy hand-stitched jute tote with soft cotton handles.', attributes: [{ name: 'Material', value: 'Jute, cotton handles' }, { name: 'Size', value: '40 × 35 × 12 cm' }], colours: ['Natural'], category: 'Bags', price: '38.00', currency: 'USD', quantity: 8, photo_key: tote, photos: [tote], plb_id: 'PLB-TOTE0001PREV', plb_url: 'https://www.sandbox.paypal.com/ncp/payment/PLB-TOTE0001PREV', status: 'ACTIVE', created_at: ago(30) },
]

// Buyer links on the scarf: one paid by the San Jose order, one still open with a special price, one expired.
const later = (h: number) => new Date(now + h * 3600_000).toISOString()
let buyerLinks: BuyerLink[] = [
  { id: 'bl_priya', listing_id: 'lst_scarf', label: 'Priya, WhatsApp', price: '22.00', colour: 'Indigo', plb_url: 'https://www.sandbox.paypal.com/ncp/payment/PLB-PRIYA0001PRV', status: 'OPEN', order_id: null, expires_at: later(110), created_at: ago(10) },
  { id: 'bl_jerry', listing_id: 'lst_scarf', label: 'Jerry, Instagram DM', price: '26.00', colour: null, plb_url: 'https://www.sandbox.paypal.com/ncp/payment/PLB-JERRY001PRV', status: 'PAID', order_id: '0AY2418885929025Y', order_city: 'San Jose', order_country: 'US', expires_at: later(100), created_at: ago(6) },
  { id: 'bl_sam', listing_id: 'lst_scarf', label: 'Sam, craft fair', price: '24.00', colour: null, plb_url: null, status: 'EXPIRED', order_id: null, expires_at: ago(20), created_at: ago(190) },
]
const summary = (o: OrderDetail): Order => {
  const { trackers, ...rest } = o
  const bl = buyerLinks.find((b) => b.order_id === o.id)
  return { ...rest, buyer_link_id: bl?.id ?? null, buyer_label: bl?.label ?? null, tracking_number: trackers.find((t) => t.status === 'SHIPPED')?.tracking_number ?? null }
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
      ? { title: 'Jute tote bag', description: 'Sturdy hand-stitched jute tote with soft cotton handles.', colours: ['Natural'], category: 'Bags', suggested_price_usd: 38, confidence: 0.82, attributes: [{ name: 'Handles', value: 'Rolled cotton' }], suggested_attributes: ['Material', 'Size', 'Closure', 'Care'] }
      : n.includes('diya') || n.includes('lamp')
        ? { title: 'Brass lotus diya, pair', description: 'Pair of polished brass lotus diyas for festive light.', colours: [], category: 'Home decor', suggested_price_usd: 18, confidence: 0.84, attributes: [{ name: 'Shape', value: 'Lotus' }], suggested_attributes: ['Material', 'Height', 'Weight', 'Set of'] }
        : { title: 'Block-print paisley scarf', description: 'Scarf with a paisley print and tasselled edges.', colours: ['Slate blue', 'Indigo'], category: 'Scarves', suggested_price_usd: 24, confidence: 0.86, attributes: [{ name: 'Pattern', value: 'Paisley' }, { name: 'Edges', value: 'Tasselled' }], suggested_attributes: ['Material', 'Size', 'Print technique', 'Care'] }
    return { photo_key: 'demo', draft, ms: 1800 }
  },
  describeListing: async (b: { title: string; colours: string[]; attributes: { name: string; value: string }[] }) => {
    await wait(1200)
    const facts = b.attributes.filter((a) => a.value).map((a) => `${a.name.toLowerCase()} ${a.value.toLowerCase()}`)
    const d = `${b.title}${facts.length ? `, ${facts.join(', ')}` : ''}${b.colours.length > 1 ? `. Comes in ${b.colours.join(' or ')}` : ''}`
    return { description: (d.charAt(0).toUpperCase() + d.slice(1) + '.').slice(0, 600) }
  },
  createListing: async () => {
    await wait(1200)
    return { id: 'lst_demo', plb_id: 'PLB-DEMO1234PREV', url: 'https://www.sandbox.paypal.com/ncp/payment/PLB-DEMO1234PREV' }
  },
  listings: async (): Promise<Listing[]> => {
    await wait(250)
    return listings.filter((l) => l.status !== 'ARCHIVED').map((l) => ({ ...l, sold: orders.filter((o) => o.listing_id === l.id && o.status !== 'REFUNDED' && o.status !== 'NEEDS_REFUND').length }))
  },
  listing: async (id: string): Promise<ListingDetail> => {
    await wait(250)
    const l = listings.find((x) => x.id === id)
    if (!l) throw new Error('not_found')
    const own = orders.filter((o) => o.listing_id === id)
    return { ...l, sold: own.filter((o) => o.status !== 'REFUNDED' && o.status !== 'NEEDS_REFUND').length, orders: own.map(summary), buyer_links: buyerLinks.filter((b) => b.listing_id === id) }
  },
  uploadListingPhoto: async (photo: File) => {
    await wait(900)
    // Mock mode has no storage, so the photo lives in this tab as a data URL.
    const photo_key = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsDataURL(photo) })
    return { photo_key }
  },
  updateListing: async (id: string, b: ListingPatch): Promise<ListingPatchResult> => {
    await wait(700)
    const l = listings.find((x) => x.id === id)
    if (!l) throw new Error('not_found')
    const sold = orders.filter((o) => o.listing_id === id && o.status !== 'REFUNDED' && o.status !== 'NEEDS_REFUND').length
    const clean = Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)) as ListingPatch
    if (clean.price) clean.price = Number(clean.price).toFixed(2)
    if (clean.photos) (clean as Partial<Listing>).photo_key = clean.photos[0]
    const quantity = clean.quantity ?? l.quantity
    if (quantity < sold) throw new Error(`Already sold ${sold}, so stock can't go below that.`)
    let { status, plb_url } = l
    let paypal: ListingPatchResult['paypal'] = status === 'ACTIVE' ? 'updated' : 'none'
    if (quantity <= sold && status === 'ACTIVE') { status = 'SOLD_OUT'; paypal = 'closed' }
    else if (quantity > sold && status === 'SOLD_OUT') {
      status = 'ACTIVE'; paypal = 'relisted'
      plb_url = `https://www.sandbox.paypal.com/ncp/payment/PLB-DEMO${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    }
    listings = listings.map((x) => (x.id === id ? { ...x, ...clean, status, plb_url } : x))
    return { ok: true, paypal, paypal_updated: paypal === 'updated', status, url: plb_url }
  },
  createBuyerLink: async (id: string, b: { label: string; price?: string; colour?: string; expires_days?: number }) => {
    await wait(900)
    const l = listings.find((x) => x.id === id)!
    const link: BuyerLink = {
      id: `bl_${Math.random().toString(36).slice(2, 8)}`, listing_id: id, label: b.label.trim(), price: Number(b.price ?? l.price).toFixed(2),
      colour: b.colour ?? null, plb_url: `https://www.sandbox.paypal.com/ncp/payment/PLB-BUY${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      status: 'OPEN', order_id: null, expires_at: later(24 * (b.expires_days ?? 7)), created_at: new Date().toISOString(),
    }
    buyerLinks = [link, ...buyerLinks]
    return { id: link.id, url: link.plb_url!, price: link.price, colour: link.colour, expires_at: link.expires_at }
  },
  closeBuyerLink: async (id: string) => {
    await wait(500)
    buyerLinks = buyerLinks.map((b) => (b.id === id && b.status === 'OPEN' ? { ...b, status: 'CLOSED' as const, plb_url: null } : b))
    return { ok: true as const, status: 'CLOSED' as const }
  },
  archiveListing: async (id: string) => { await wait(600); listings = listings.map((x) => (x.id === id ? { ...x, status: 'ARCHIVED' as const } : x)); return { ok: true } },
  orders: async () => { await wait(300); maybeArrive(); return orders.map(summary) },
  order: async (id: string) => { await wait(250); const o = find(id); const bl = buyerLinks.find((b) => b.order_id === id); return { ...o, buyer_link_id: bl?.id ?? null, buyer_label: bl?.label ?? null } },
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
  ask: async (question: string, _history: unknown[] = []): Promise<{ answer: string; actions: ProposedAction[] }> => {
    await wait(1400)
    const q = question.toLowerCase()
    if (q.includes('protect'))
      return { actions: [], answer: '**1 paid order isn\'t protected yet.**\n\n| Order | Product | Ship to | Next step |\n|---|---|---|---|\n| `0AY2418885929025Y` | Paisley scarf, Slate blue | San Jose, US | Scan the courier slip |\n\nThe Montreal order has tracking, but PayPal marks it only *partially eligible*.' }
    if (q.includes('ship'))
      return { actions: [], answer: 'Ship **1 order** today:\n\n- Slate blue paisley scarf to **San Jose, CA 95131**\n\nThe London buyer paid after the scarf sold out, so that order needs a refund instead.' }
    if (q.includes('dispute') || q.includes('refund'))
      return {
        answer: 'No open disputes on your orders.\n\nOne order needs a refund: the London buyer paid **$26.00** after the last scarf sold. I\'ve set up the refund below.',
        actions: [{ id: 'act_refund', kind: 'refund', order_id: orders.find((o) => o.status === 'NEEDS_REFUND')?.id ?? '', summary: 'Refund $26.00 for Block-print paisley scarf to London, GB. They paid after it sold out.' }],
      }
    return { actions: [], answer: '### Sales by product\n\n| Product | Orders | Revenue |\n|---|---:|---:|\n| Block-print paisley scarf | 3 | $76.00 |\n| Brass lotus diya, pair | 1 | $18.00 |\n\nThe **scarf** is your best seller. Slate blue outsells Indigo 2 to 1.' }
  },
}
