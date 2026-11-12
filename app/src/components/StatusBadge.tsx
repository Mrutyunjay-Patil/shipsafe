import { CircleDollarSign, RotateCcw, ShieldCheck, TriangleAlert, Truck } from 'lucide-react'
import type { OrderStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAP: Record<OrderStatus, { label: string; icon: typeof Truck; cls: string }> = {
  PAID: { label: 'Paid, ship it', icon: CircleDollarSign, cls: 'bg-warning/15 text-warning' },
  SHIPPED: { label: 'Shipped', icon: Truck, cls: 'bg-brand-soft text-brand' },
  PROTECTED: { label: 'Protected', icon: ShieldCheck, cls: 'bg-success/15 text-success' },
  REFUNDED: { label: 'Refunded', icon: RotateCcw, cls: 'bg-muted text-muted-foreground' },
  NEEDS_REFUND: { label: 'Sold twice', icon: TriangleAlert, cls: 'bg-destructive/12 text-destructive' },
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const m = MAP[status] ?? MAP.PAID
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', m.cls, className)}>
      <m.icon className="size-3.5" />
      {m.label}
    </span>
  )
}
