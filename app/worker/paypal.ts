// Thin PayPal REST client for the Worker. Endpoints and fields were checked in the sandbox
// probes (shipsafe-prereq/REPORT.md).
import type { Env } from './env'

let cached: { token: string; exp: number } | null = null

export class PayPalError extends Error {
  constructor(public status: number, public body: unknown, public debugId?: string | null) {
    super(`PayPal ${status}`)
  }
  get issue(): string | undefined {
    const b = this.body as { details?: { issue?: string }[]; name?: string } | undefined
    return b?.details?.[0]?.issue ?? b?.name
  }
}

export async function appToken(env: Env): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  const r = await fetch(`${env.PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!r.ok) throw new PayPalError(r.status, await r.json().catch(() => null))
  const j = (await r.json()) as { access_token: string; expires_in: number }
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 }
  return j.access_token
}

export async function pp<T = any>(
  env: Env,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const r = await fetch(env.PAYPAL_BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${await appToken(env)}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  const json = text ? JSON.parse(text) : null
  if (!r.ok) throw new PayPalError(r.status, json, r.headers.get('paypal-debug-id'))
  return json as T
}

// ---- Payment Links and Buttons ----

export type LinkInput = {
  listingId: string
  title: string
  description: string
  price: string
  currency: string
  colours: string[]
  returnUrl: string
}

function linkBody(i: LinkInput) {
  const item: Record<string, unknown> = {
    name: i.title.slice(0, 127),
    product_id: i.listingId,
    description: i.description.slice(0, 2048),
    unit_amount: { currency_code: i.currency, value: i.price },
    collect_shipping_address: true,
  }
  if (i.colours.length > 1) {
    item.variants = {
      dimensions: [{ name: 'Colour', primary: true, options: i.colours.slice(0, 10).map((label) => ({ label })) }],
    }
  }
  return { integration_mode: 'LINK', type: 'BUY_NOW', reusable: 'MULTIPLE', return_url: i.returnUrl, line_items: [item] }
}

export async function createLink(env: Env, i: LinkInput) {
  const res = await pp<{ id: string; links: { rel: string; href: string }[] }>(
    env, 'POST', '/v1/checkout/payment-resources', linkBody(i), { 'PayPal-Request-Id': crypto.randomUUID() },
  )
  // Probe C3: the buyer URL is only in links[] with rel "payment_link".
  const url = res.links.find((l) => l.rel === 'payment_link')?.href
  return { id: res.id, url: url ?? null }
}

export const deleteLink = (env: Env, plbId: string) =>
  pp(env, 'DELETE', `/v1/checkout/payment-resources/${plbId}`).catch((e) => {
    if (e instanceof PayPalError && e.status === 404) return null
    throw e
  })

// ---- Orders, captures, tracking, refunds ----

export const getCapture = (env: Env, id: string) => pp(env, 'GET', `/v2/payments/captures/${id}`)
export const getOrder = (env: Env, id: string) => pp(env, 'GET', `/v2/checkout/orders/${id}`)

export async function addTracker(
  env: Env,
  orderId: string,
  t: { captureId: string; trackingNumber: string; carrier: string; carrierNameOther?: string; item: { name: string; sku?: string } },
) {
  const body: Record<string, unknown> = {
    capture_id: t.captureId,
    tracking_number: t.trackingNumber,
    carrier: t.carrier,
    notify_payer: true,
    items: [{ name: t.item.name, sku: t.item.sku, quantity: '1' }],
  }
  if (t.carrier === 'OTHER') body.carrier_name_other = t.carrierNameOther
  return pp(env, 'POST', `/v2/checkout/orders/${orderId}/track`, body)
}

export const cancelTracker = (env: Env, orderId: string, trackerId: string) =>
  pp(env, 'PATCH', `/v2/checkout/orders/${orderId}/trackers/${trackerId}`, [
    { op: 'replace', path: '/status', value: 'CANCELLED' },
  ])

export const refundCapture = (env: Env, captureId: string, note: string) =>
  pp(env, 'POST', `/v2/payments/captures/${captureId}/refund`, { note_to_payer: note.slice(0, 255) })

export const listDisputes = (env: Env) => pp(env, 'GET', '/v1/customer/disputes?page_size=20')

// ---- Webhook signature ----

export async function verifyWebhook(env: Env, headers: Headers, rawBody: string): Promise<boolean> {
  const h = (k: string) => headers.get(k)
  if (!h('paypal-transmission-id')) return false
  const res = await pp<{ verification_status: string }>(env, 'POST', '/v1/notifications/verify-webhook-signature', {
    auth_algo: h('paypal-auth-algo'),
    cert_url: h('paypal-cert-url'),
    transmission_id: h('paypal-transmission-id'),
    transmission_sig: h('paypal-transmission-sig'),
    transmission_time: h('paypal-transmission-time'),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(rawBody),
  })
  return res.verification_status === 'SUCCESS'
}

// ---- Log in with PayPal ----

export const LOGIN_SCOPE = 'openid email https://uri.paypal.com/services/paypalattributes'

export function loginUrl(env: Env, redirectUri: string, state: string) {
  const q = new URLSearchParams({
    flowEntry: 'static', client_id: env.PAYPAL_CLIENT_ID, response_type: 'code',
    scope: LOGIN_SCOPE, redirect_uri: redirectUri, state,
  })
  return `${env.PAYPAL_WEB}/connect/?${q}`
}

export async function exchangeCode(env: Env, code: string) {
  const r = await fetch(`${env.PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code }),
  })
  if (!r.ok) throw new PayPalError(r.status, await r.json().catch(() => null))
  return (await r.json()) as { access_token: string; scope: string }
}

// Probe C17: sandbox userinfo returns 400 for Business accounts and only {sub,user_id} for
// Personal ones. Callers must treat every field as optional.
export async function userInfo(env: Env, userToken: string) {
  const r = await fetch(`${env.PAYPAL_BASE}/v1/identity/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  if (!r.ok) return null
  return (await r.json()) as { user_id?: string; sub?: string; name?: string; verified_account?: boolean | string }
}
