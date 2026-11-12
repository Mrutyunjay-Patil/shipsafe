import { type CSSProperties, useState } from 'react'
import { Link } from 'react-router'
import { Destination, Stamp } from '@/components/airmail'
import { STATUS, StatusBadge } from '@/components/StatusBadge'
import { money, type Order, photoUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

// Orders seen in this session. A row whose order arrives later (a webhook landed while the
// app was open) slides in like a letter arriving; everything else renders still.
const seen = new Set<string>()
let primed = false
export function primeSeen(ids: string[]) {
  if (primed) return
  ids.forEach((id) => seen.add(id))
  primed = true
}

// Destination leads every row, the way a departures board or a sorting rack reads.
export function OrderRow({ order: o }: { order: Order }) {
  const hue = STATUS[o.status]?.hue
  const [fresh] = useState(() => primed && !seen.has(o.id))
  seen.add(o.id)
  return (
    <Link
      to={`/orders/${o.id}`}
      style={{ '--hue': hue } as CSSProperties}
      className={cn('group relative flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent/40 active:bg-accent/60', fresh && 'arrive')}
    >
      <Stamp src={photoUrl(o.photo_key)} className="size-14 self-start" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <Destination city={o.ship_city} country={o.ship_country} className="min-w-0 truncate text-[19px]" />
          <span className="money shrink-0 text-[15px] font-semibold">{money(o.amount, o.currency)}</span>
        </span>
        <span className="mt-1 block truncate text-[13px] text-muted-foreground">
          {o.title}{o.variant && ` · ${o.variant}`}
        </span>
        <StatusBadge status={o.status} short className="mt-2" />
      </span>
    </Link>
  )
}
