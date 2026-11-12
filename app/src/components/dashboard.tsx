import { Check, CircleDollarSign, Link2, PackageCheck, RotateCcw, ShieldCheck, TriangleAlert, Truck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { type Activity, timeAgo } from '@/lib/insights'
import { money } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Sales per day as bars. Today's bar is drawn in ink, earlier days in a lighter ink. */
export function SalesChart({ days, tall }: { days: { date: Date; key: string; total: number; count: number }[]; tall?: boolean }) {
  const max = Math.max(1, ...days.map((d) => d.total))
  const sum = days.reduce((a, d) => a + d.total, 0)
  const best = days.reduce((a, d) => (d.total > a.total ? d : a), days[0])
  return (
    <figure className={cn('sheet flex flex-col rounded-2xl p-4', tall && 'p-5')}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">Sales, last 14 days</span>
        <span className="money text-[15px] font-semibold text-ink">{money(sum)}</span>
      </figcaption>
      <div className={cn('mt-4 flex items-end gap-[5px]', tall ? 'min-h-40 flex-1' : 'h-28')} role="img" aria-label={`Sales over the last 14 days, ${money(sum)} in total`}>
        {days.map((d, i) => {
          const h = d.total ? Math.max(6, (d.total / max) * 100) : 3
          const today = i === days.length - 1
          return (
            <span key={d.key} className="group relative flex h-full flex-1 items-end">
              <span
                className={cn('w-full rounded-t-[4px] transition-[height] duration-500 ease-out', d.total ? (today ? 'bg-ink' : 'bg-ink/35') : 'bg-border')}
                style={{ height: `${h}%` }}
              />
              {d.total > 0 && (
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper group-hover:block">
                  {d.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {money(d.total)}
                </span>
              )}
            </span>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{days[0].date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        {best.total > 0 && <span>Best day {best.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, {money(best.total)}</span>}
        <span>Today</span>
      </div>
    </figure>
  )
}

/** How many paid orders PayPal now protects, split into protected, in the post and waiting. */
export function ProtectionMeter({ p }: { p: { total: number; done: number; posted: number; waiting: number; rate: number } }) {
  const seg = (n: number) => `${p.total ? (n / p.total) * 100 : 0}%`
  return (
    <section className="sheet rounded-2xl p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Seller protection</h2>
        <span className="money text-[15px] font-semibold text-ink">{Math.round(p.rate * 100)}%</span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {p.done} of {p.total} paid orders have tracking on PayPal.
      </p>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <span className="bg-status-protected" style={{ width: seg(p.done) }} />
        <span className="bg-status-shipped" style={{ width: seg(p.posted) }} />
        <span className="bg-status-paid" style={{ width: seg(p.waiting) }} />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-status-protected" /> Protected {p.done}</li>
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-status-shipped" /> In the post {p.posted}</li>
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-status-paid" /> To post {p.waiting}</li>
      </ul>
    </section>
  )
}

const EVENT = {
  paid: { icon: CircleDollarSign, hue: 'var(--status-paid)', text: (o: Activity['order']) => `${o.ship_city} paid ${money(o.amount, o.currency)}` },
  posted: { icon: Truck, hue: 'var(--status-shipped)', text: (o: Activity['order']) => `Posted to ${o.ship_city}` },
  protected: { icon: ShieldCheck, hue: 'var(--status-protected)', text: (o: Activity['order']) => `${o.ship_city} order shipped safe` },
  refund: { icon: RotateCcw, hue: 'var(--status-closed)', text: (o: Activity['order']) => `Refunded ${o.ship_city}` },
  oversold: { icon: TriangleAlert, hue: 'var(--status-refund)', text: (o: Activity['order']) => `${o.ship_city} paid after it sold out` },
}

export function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <section className="sheet rounded-2xl">
      <h2 className="px-4 pb-1 pt-4 text-[15px] font-semibold">Recent activity</h2>
      {items.length === 0 && <p className="px-4 pb-5 pt-2 text-sm text-muted-foreground">Payments, posting and protection show up here as they happen.</p>}
      <ol className="px-4 pb-3">
        {items.map((a, i) => {
          const e = EVENT[a.kind]
          return (
            <li key={a.id} className="relative flex gap-3 py-2.5" style={{ '--hue': e.hue } as CSSProperties}>
              {i < items.length - 1 && <span aria-hidden="true" className="absolute left-[13px] top-9 h-[calc(100%-24px)] w-px bg-border" />}
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--hue)_15%,transparent)] text-[color-mix(in_oklch,var(--hue)_80%,var(--foreground))]">
                <e.icon className="size-3.5" strokeWidth={2.2} />
              </span>
              <Link to={`/orders/${a.order.id}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate text-[14px] font-medium">{e.text(a.order)}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{a.order.title} · {timeAgo(a.at)}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** First-run checklist. Each step is checked from real shop state; hidden once all are done. */
export function SetupChecklist({ steps }: { steps: { label: string; done: boolean; to: string }[] }) {
  if (steps.every((s) => s.done)) return null
  const done = steps.filter((s) => s.done).length
  return (
    <section className="sheet rounded-2xl p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">Get your shop ready</h2>
        <span className="money text-[13px] text-muted-foreground">{done} of {steps.length}</span>
      </div>
      <ol className="mt-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link to={s.to} className="flex items-center gap-3 py-2 text-[14px]">
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border', s.done ? 'border-transparent bg-success text-paper' : 'border-border')}>
                {s.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className={cn(s.done && 'text-muted-foreground line-through decoration-border')}>{s.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

export const setupSteps = (hasListing: boolean, hasSale: boolean, hasPosted: boolean) => [
  { label: 'Connect PayPal', done: true, to: '/account' },
  { label: 'List your first product', done: hasListing, to: '/sell' },
  { label: 'Get your first PayPal payment', done: hasSale, to: '/products' },
  { label: 'Post a parcel and scan the slip', done: hasPosted, to: '/orders' },
]

/** A grid of shop figures. Each figure carries its own comparison or context line. */
export function StatStrip({ items, cols = 4 }: { items: { label: string; value: string; note?: string; tone?: 'up' | 'down' }[]; cols?: 2 | 4 }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--sheet-border)] bg-border/70 shadow-[var(--sheet-shadow)]', cols === 4 && 'sm:grid-cols-4')}>
      {items.map((s) => (
        <div key={s.label} className="bg-card px-4 py-3.5">
          <dt className="text-[12px] text-muted-foreground">{s.label}</dt>
          <dd className="money mt-1 text-[20px] font-semibold leading-none">{s.value}</dd>
          {s.note && (
            <dd className={cn('mt-1.5 text-[11px]', s.tone === 'up' ? 'text-success' : s.tone === 'down' ? 'text-status-refund' : 'text-muted-foreground')}>{s.note}</dd>
          )}
        </div>
      ))}
    </dl>
  )
}

export { Link2, PackageCheck }
