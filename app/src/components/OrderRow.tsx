import { Package } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/StatusBadge'
import { money, type Order, photoUrl } from '@/lib/api'

export function OrderRow({ order: o }: { order: Order }) {
  const img = photoUrl(o.photo_key)
  return (
    <Link to={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand">
        {img ? <img src={img} alt="" className="size-full object-cover" /> : <Package className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{o.title ?? 'Order'}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[o.variant, o.ship_city, o.ship_country].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="money text-sm font-semibold">{money(o.amount, o.currency)}</span>
        <StatusBadge status={o.status} />
      </span>
    </Link>
  )
}
