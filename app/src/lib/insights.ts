// Shop insights computed from real order data. Nothing here is invented: every number is
// derived from the orders the API returns.
import type { Order } from './api'

const DAY = 86_400_000
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export const isSale = (o: Order) => o.status !== 'REFUNDED' && o.status !== 'NEEDS_REFUND'

export function dailySales(orders: Order[], days = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * DAY)
    return { date: d, key: dayKey(d), total: 0, count: 0 }
  })
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const o of orders) {
    if (!isSale(o)) continue
    const b = byKey.get(dayKey(new Date(o.paid_at)))
    if (b) { b.total += Number(o.amount); b.count += 1 }
  }
  return buckets
}

export function monthTotals(orders: Order[]) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  let cur = 0, prev = 0, curN = 0
  for (const o of orders) {
    if (!isSale(o)) continue
    const t = new Date(o.paid_at).getTime()
    if (t >= start) { cur += Number(o.amount); curN += 1 }
    else if (t >= prevStart) prev += Number(o.amount)
  }
  return { cur, prev, count: curN, change: prev > 0 ? (cur - prev) / prev : null }
}

export function protection(orders: Order[]) {
  const paid = orders.filter(isSale)
  const done = paid.filter((o) => o.status === 'PROTECTED').length
  const posted = paid.filter((o) => o.status === 'SHIPPED').length
  const waiting = paid.filter((o) => o.status === 'PAID').length
  return { total: paid.length, done, posted, waiting, rate: paid.length ? done / paid.length : 0 }
}

/** Average hours from payment to posting, over orders that have been posted. */
export function hoursToPost(orders: Order[]) {
  const xs = orders.filter((o) => o.shipped_at).map((o) => (new Date(o.shipped_at!).getTime() - new Date(o.paid_at).getTime()) / 3_600_000)
  if (!xs.length) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export type Activity = { id: string; at: string; kind: 'paid' | 'posted' | 'protected' | 'refund' | 'oversold'; order: Order }

export function activity(orders: Order[], limit = 8): Activity[] {
  const ev: Activity[] = []
  for (const o of orders) {
    if (o.status === 'NEEDS_REFUND') ev.push({ id: `${o.id}-o`, at: o.paid_at, kind: 'oversold', order: o })
    else ev.push({ id: `${o.id}-p`, at: o.paid_at, kind: 'paid', order: o })
    if (o.shipped_at) ev.push({ id: `${o.id}-s`, at: o.shipped_at, kind: o.status === 'PROTECTED' ? 'protected' : 'posted', order: o })
    if (o.status === 'REFUNDED') ev.push({ id: `${o.id}-r`, at: o.shipped_at ?? o.paid_at, kind: 'refund', order: o })
  }
  return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

export function timeAgo(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}
