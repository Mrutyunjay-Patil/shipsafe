import { CircleDollarSign, RotateCcw, ShieldCheck, TriangleAlert, Truck } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { OrderStatus } from '@/lib/api'
import { ParAvion } from '@/components/airmail'
import { cn } from '@/lib/utils'

// Each status owns one hue (theme.css --status-*). Icon and words carry the meaning too,
// so state never relies on colour alone.
export const STATUS: Record<OrderStatus, { label: string; short: string; icon: typeof Truck; hue: string; next: string }> = {
  PAID: { label: 'Paid, post it', short: 'To post', icon: CircleDollarSign, hue: 'var(--status-paid)', next: 'Scan the courier slip' },
  SHIPPED: { label: 'In the post', short: 'In the post', icon: Truck, hue: 'var(--status-shipped)', next: 'Waiting on PayPal protection' },
  PROTECTED: { label: 'Protected', short: 'Protected', icon: ShieldCheck, hue: 'var(--status-protected)', next: 'Nothing to do' },
  REFUNDED: { label: 'Refunded', short: 'Refunded', icon: RotateCcw, hue: 'var(--status-closed)', next: 'Closed' },
  NEEDS_REFUND: { label: 'Sold twice, refund', short: 'Refund', icon: TriangleAlert, hue: 'var(--status-refund)', next: 'Refund this buyer' },
}

export function StatusBadge({ status, className, short }: { status: OrderStatus; className?: string; short?: boolean }) {
  if (status === 'PROTECTED') return <ParAvion small className={className} />
  const m = STATUS[status] ?? STATUS.PAID
  return (
    <span
      style={{ '--hue': m.hue } as CSSProperties}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold whitespace-nowrap',
        'bg-[color-mix(in_oklch,var(--hue)_14%,transparent)] text-[color-mix(in_oklch,var(--hue)_78%,var(--foreground))]',
        className,
      )}
    >
      <m.icon className="size-3.5" strokeWidth={2.2} />
      {short ? m.short : m.label}
    </span>
  )
}
