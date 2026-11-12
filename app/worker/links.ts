// Closing a listing's PayPal links. A listing has one shared link plus any one-buyer links;
// when it sells out or the seller closes it, every one of them must stop taking payments.
import type { Env } from './env'
import { deleteLink } from './paypal'

export async function closeBuyerLinks(env: Env, listingId: string, status: 'CLOSED' | 'EXPIRED' = 'CLOSED') {
  const open = await env.DB.prepare("SELECT id, plb_id FROM buyer_links WHERE listing_id = ? AND status = 'OPEN'")
    .bind(listingId).all<{ id: string; plb_id: string | null }>()
  for (const b of open.results) {
    if (b.plb_id) await deleteLink(env, b.plb_id)
    await env.DB.prepare("UPDATE buyer_links SET status = ? WHERE id = ? AND status = 'OPEN'").bind(status, b.id).run()
  }
  return open.results.length
}

/** Hourly: close buyer links past their expiry date. */
export async function expireBuyerLinks(env: Env) {
  const due = await env.DB.prepare("SELECT id, plb_id FROM buyer_links WHERE status = 'OPEN' AND expires_at < ? LIMIT 200")
    .bind(new Date().toISOString()).all<{ id: string; plb_id: string | null }>()
  for (const b of due.results) {
    if (b.plb_id) await deleteLink(env, b.plb_id).catch((e) => console.error('expire', b.id, String(e)))
    await env.DB.prepare("UPDATE buyer_links SET status = 'EXPIRED' WHERE id = ? AND status = 'OPEN'").bind(b.id).run()
  }
  return due.results.length
}
