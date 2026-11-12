// Seller sign-in with Log in with PayPal.
// Probe C17: in the sandbox, userinfo returns 400 for Business accounts and only {sub, user_id}
// for Personal ones, and never returns verified_account. So:
//   - a Personal login is identified by its PayPal user_id;
//   - a Business login (userinfo 400) is the shop owner of this PayPal app, since only the app's
//     own Business account can complete the flow without a user_id in this setup.
// paypal_verified stays NULL until PayPal actually returns verified_account.
import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { BASE } from '../shared/base'
import type { AppEnv, Env } from './env'
import { exchangeCode, loginUrl, userInfo } from './paypal'

const COOKIE = 'ss_session'
const STATE_COOKIE = 'ss_oauth_state'
const DAYS = 7

// PayPal must know the return URL. LOGIN_REDIRECT_URI lets sign-in return through another
// registered URL that forwards here (see the probe Worker); unset, the app's own callback is used.
const callbackUrl = (c: Context<AppEnv>) => c.env.LOGIN_REDIRECT_URI || new URL('/auth/paypal/callback', c.req.url).toString()

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function startLogin(c: Context<AppEnv>) {
  // The sign-in hop forwards PayPal's reply by this prefix: "mpd." to mrutyunjaypatil.dev, "app." to workers.dev.
  const host = new URL(c.req.url).hostname
  const state = `${host === 'mrutyunjaypatil.dev' ? 'mpd' : 'app'}.${crypto.randomUUID()}`
  setCookie(c, STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 600 })
  return c.redirect(loginUrl(c.env, callbackUrl(c), state))
}

export async function finishLogin(c: Context<AppEnv>) {
  const { code, state, error } = c.req.query()
  if (error || !code) return c.redirect(`${BASE}/?login=failed`)
  if (!state || state !== getCookie(c, STATE_COOKIE)) return c.redirect(`${BASE}/?login=state`)
  deleteCookie(c, STATE_COOKIE, { path: '/' })

  const tok = await exchangeCode(c.env, code)
  const info = await userInfo(c.env, tok.access_token)
  const sellerId = info?.user_id ? `pp_${await sha256(info.user_id)}`.slice(0, 40) : 'pp_business_owner'
  const verified = info?.verified_account === undefined ? null : String(info.verified_account) === 'true' ? 1 : 0

  await c.env.DB.prepare(
    `INSERT INTO sellers (id, display_name, paypal_verified) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET paypal_verified = COALESCE(excluded.paypal_verified, sellers.paypal_verified)`,
  ).bind(sellerId, info?.name ?? null, verified).run()

  const raw = crypto.randomUUID() + crypto.randomUUID()
  const expires = new Date(Date.now() + DAYS * 86400_000).toISOString()
  await c.env.DB.prepare('INSERT INTO sessions (id, seller_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(raw), sellerId, expires).run()
  setCookie(c, COOKIE, raw, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: DAYS * 86400 })
  return c.redirect(`${BASE}/`)
}

export async function logout(c: Context<AppEnv>) {
  const raw = getCookie(c, COOKIE)
  if (raw) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(raw)).run()
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
}

export async function sellerFromCookie(env: Env, raw: string | undefined) {
  if (!raw) return null
  return env.DB.prepare(
    `SELECT s.* FROM sessions x JOIN sellers s ON s.id = x.seller_id WHERE x.id = ? AND x.expires_at > ?`,
  ).bind(await sha256(raw), new Date().toISOString()).first<{ id: string; display_name: string | null; paypal_verified: number | null }>()
}

export const requireSeller: MiddlewareHandler<AppEnv> = async (c, next) => {
  const s = await sellerFromCookie(c.env, getCookie(c, COOKIE))
  if (!s) return c.json({ error: 'signin_required' }, 401)
  c.set('sellerId', s.id)
  await next()
}

export const currentSeller = (c: Context<AppEnv>) => sellerFromCookie(c.env, getCookie(c, COOKIE))
