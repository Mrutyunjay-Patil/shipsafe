import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { OrderRow, primeSeen } from '@/components/OrderRow'
import { Skeleton } from '@/components/ui/skeleton'
import { api, MOCK, type OrderStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

const FILTERS: { key: 'ALL' | OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'To post' },
  { key: 'SHIPPED', label: 'In the post' },
  { key: 'PROTECTED', label: 'Protected' },
  { key: 'NEEDS_REFUND', label: 'Refund' },
]

export default function Orders() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('filter') ?? 'ALL') as (typeof FILTERS)[number]['key']
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders, refetchInterval: MOCK ? 4_000 : 20_000 })
  if (orders.data) primeSeen(orders.data.map((o) => o.id))
  const list = (orders.data ?? []).filter((o) => filter === 'ALL' || o.status === filter)

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="pb-4 pt-3">
        <h1 className="text-[26px] font-semibold leading-tight">Orders</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">New PayPal payments land here on their own.</p>
      </header>
      <div role="tablist" aria-label="Filter orders" className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setParams(f.key === 'ALL' ? {} : { filter: f.key })}
            role="tab"
            aria-selected={filter === f.key}
            className={cn(
              'h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors duration-200',
              filter === f.key ? 'border-ink bg-ink text-paper' : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="sheet divide-y divide-border/70 overflow-hidden rounded-2xl">
        {orders.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="m-3 h-12" />)}
        {!orders.isLoading && list.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">{filter === 'ALL' ? 'No orders yet. Share a PayPal link in a chat and paid orders appear here.' : 'Nothing in this pile right now.'}</p>}
        {list.map((o) => <OrderRow key={o.id} order={o} />)}
      </div>
    </main>
  )
}
