import { mockApi } from './mock'
// Typed client for the ShipSafe Worker API.

export type Seller = { id: string; display_name: string | null; paypal_verified: number | null }
export type Me = { signedIn: true; seller: Seller } | { signedIn: false }

export type Account = {
  seller: Seller & { connected_at: string }
  counts: { active_listings: number; orders: number; protected: number; paid_total: number }
  last_webhook: { received_at: string; event_type: string } | null
  environment: 'sandbox' | 'live'
  webhook_url: string
}

export type OrderStatus = 'PAID' | 'SHIPPED' | 'PROTECTED' | 'REFUNDED' | 'NEEDS_REFUND'

export type Listing = {
  id: string; title: string; description: string; colours: string[]; attributes?: Attribute[]; category: string | null
  price: string; currency: string; quantity: number; photo_key: string | null; photos: string[]
  plb_id: string | null; plb_url: string | null; status: 'DRAFT' | 'ACTIVE' | 'SOLD_OUT' | 'ARCHIVED'
  sold: number; created_at: string
}

export type BuyerLink = {
  id: string; listing_id: string; label: string; price: string; colour: string | null
  plb_url: string | null; status: 'OPEN' | 'PAID' | 'CLOSED' | 'EXPIRED'; order_id: string | null
  order_city?: string | null; order_country?: string | null; expires_at: string; created_at: string
}
export type ListingDetail = Listing & { orders: Order[]; buyer_links: BuyerLink[] }

export type Order = {
  id: string; listing_id: string | null; capture_id: string; status: OrderStatus
  amount: string; currency: string; variant: string | null; title: string | null; photo_key: string | null
  buyer_country: string | null; buyer_account_status: string | null
  ship_name: string | null; ship_line1: string | null; ship_line2: string | null; ship_city: string | null
  ship_state: string | null; ship_postcode: string | null; ship_country: string | null
  seller_protection: string | null; paid_at: string; shipped_at: string | null; tracking_number?: string | null
  buyer_link_id?: string | null; buyer_label?: string | null
}

export type Tracker = {
  id: string; tracking_number: string; carrier: string; status: 'SHIPPED' | 'CANCELLED'; created_at: string
  checks: Partial<SlipChecks>
}
export type OrderDetail = Order & { trackers: Tracker[] }

export type Attribute = { name: string; value: string }

export type ListingPatch = {
  title?: string; description?: string; price?: string; colours?: string[]; quantity?: number; attributes?: Attribute[]; photo_key?: string; photos?: string[]
}
export type ListingPatchResult = {
  ok: true; paypal: 'updated' | 'relisted' | 'closed' | 'none'; paypal_updated: boolean; status: Listing['status']; url: string | null
}

export type ListingDraft = {
  title: string; description: string; colours: string[]; category: string; suggested_price_usd: number; confidence: number
  attributes?: Attribute[]; suggested_attributes?: string[]
}

export type SlipChecks = {
  readable: boolean
  s10: boolean
  address: { city: boolean; postcode: boolean; country: boolean; match: boolean }
  duplicate: string | null
}
export type SlipResult = {
  slip_key: string
  read: { carrier: string; tracking_number: string; destination_city: string; destination_postcode: string; destination_country: string }
  carrier: { carrier: string; carrier_name_other?: string }
  checks: SlipChecks
  ms: number
}

export class ApiError extends Error {
  status: number
  body: any
  constructor(status: number, body: any) {
    super(body?.error === 'paypal' ? `PayPal turned it down (${body.issue ?? body.status})` : body?.message || body?.issue || body?.error || `HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { credentials: 'same-origin', ...init })
  const text = await r.text()
  const body = text ? JSON.parse(text) : null
  if (!r.ok) throw new ApiError(r.status, body)
  return body as T
}

const json = (method: string, body?: unknown): RequestInit => ({
  method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})

const upload = (field: string, file: File): RequestInit => {
  const fd = new FormData()
  fd.append(field, file)
  return { method: 'POST', body: fd }
}

const realApi = {
  me: () => req<Me>('/api/me'),
  account: () => req<Account>('/api/account'),
  logout: () => req('/api/logout', json('POST')),
  draftListing: (photo: File) => req<{ photo_key: string; draft: ListingDraft; ms: number }>('/api/listings/draft', upload('photo', photo)),
  createListing: (b: {
    title: string; description: string; colours: string[]; attributes?: Attribute[]; category?: string; price: string; quantity: number
    photo_key?: string; photo_keys?: string[]; ai_confidence?: number
  }) => req<{ id: string; plb_id: string; url: string }>('/api/listings', json('POST', b)),
  describeListing: (b: { title: string; category?: string; colours: string[]; attributes: Attribute[]; current?: string }) =>
    req<{ description: string }>('/api/listings/describe', json('POST', b)),
  listings: () => req<Listing[]>('/api/listings'),
  listing: (id: string) => req<ListingDetail>(`/api/listings/${id}`),
  uploadListingPhoto: (photo: File) => req<{ photo_key: string }>('/api/listings/photo', upload('photo', photo)),
  updateListing: (id: string, b: ListingPatch) => req<ListingPatchResult>(`/api/listings/${id}`, json('PATCH', b)),
  createBuyerLink: (id: string, b: { label: string; price?: string; colour?: string; expires_days?: number }) =>
    req<{ id: string; url: string; price: string; colour: string | null; expires_at: string }>(`/api/listings/${id}/buyer-links`, json('POST', b)),
  closeBuyerLink: (id: string) => req<{ ok: true; status: BuyerLink['status'] }>(`/api/buyer-links/${id}/close`, json('POST')),
  archiveListing: (id: string) => req(`/api/listings/${id}`, json('DELETE')),
  orders: () => req<Order[]>('/api/orders'),
  order: (id: string) => req<OrderDetail>(`/api/orders/${id}`),
  readSlip: (id: string, slip: File) => req<SlipResult>(`/api/orders/${id}/slip`, upload('slip', slip)),
  track: (id: string, b: { tracking_number: string; carrier: string; carrier_name_other?: string; slip_key?: string; checks?: unknown }) =>
    req<{ tracker_id: string; status: OrderStatus }>(`/api/orders/${id}/track`, json('POST', b)),
  cancelTracker: (id: string, tid: string) => req(`/api/orders/${id}/trackers/${encodeURIComponent(tid)}/cancel`, json('POST')),
  refund: (id: string) => req<{ refund_id: string; status: string }>(`/api/orders/${id}/refund`, json('POST')),
  ask: (question: string) => req<{ answer: string }>('/api/ask', json('POST', { question })),
}

export const MOCK = import.meta.env.VITE_MOCK === '1'
export const api: typeof realApi = MOCK ? (mockApi as unknown as typeof realApi) : realApi

export const photoUrl = (key: string | null) =>
  !key ? null : key.startsWith('data:') || key.startsWith('/sample/') ? key : MOCK ? null : `/api/photos/${key}`

export const money = (v: string | number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(v))
