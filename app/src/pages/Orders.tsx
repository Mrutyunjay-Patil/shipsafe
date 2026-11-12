import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { OrderRow } from '@/components/OrderRow'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type OrderStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

const FILTERS: { key: 'ALL' | OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'To ship' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'PROTECTED', label: 'Protected' },
  { key: 'NEEDS_REFUND', label: 'Sold twice' },
]

export default function Orders() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('filter') ?? 'ALL') as (typeof FILTERS)[number]['key']
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders, refetchInterval: 20_000 })
  const list = (orders.data ?? []).filter((o) => filter === 'ALL' || o.status === filter)

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="py-3">
        <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">New PayPal payments appear here on their own.</p>
      </header>
      <div className="glass -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-full p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setParams(f.key === 'ALL' ? {} : { filter: f.key })}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="glass divide-y divide-border/60 overflow-hidden rounded-2xl">
        {orders.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="m-3 h-12" />)}
        {!orders.isLoading && list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
        {list.map((o) => <OrderRow key={o.id} order={o} />)}
      </div>
    </main>
  )
}
