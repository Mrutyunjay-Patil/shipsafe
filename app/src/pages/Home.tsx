import { useQuery } from '@tanstack/react-query'
import { Camera, ChevronRight, MessageCircle, ScanLine, ShieldCheck, Table2 } from 'lucide-react'
import { Link } from 'react-router'
import { OrderRow } from '@/components/OrderRow'
import { Skeleton } from '@/components/ui/skeleton'
import { api, money, type Seller } from '@/lib/api'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Home({ seller }: { seller: Seller }) {
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders })
  const list = orders.data ?? []
  const live = list.filter((o) => o.status !== 'REFUNDED')
  const total = live.reduce((s, o) => s + Number(o.amount), 0)
  const toShip = list.filter((o) => o.status === 'PAID').length
  const protectedCount = list.filter((o) => o.status === 'PROTECTED').length
  const needsRefund = list.filter((o) => o.status === 'NEEDS_REFUND').length

  const actions = [
    { to: '/sell', label: 'Sell', icon: Camera },
    { to: '/orders?filter=PAID', label: 'Ship', icon: ScanLine },
    { to: '/ask', label: 'Ask', icon: MessageCircle },
    { to: '/board', label: 'Board', icon: Table2 },
  ]

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-xl font-semibold tracking-tight">{seller.display_name ?? 'Your shop'}</h1>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand"
          title={seller.paypal_verified ? 'PayPal says this account is verified' : 'Signed in with PayPal'}
        >
          <ShieldCheck className="size-3.5" />
          {seller.paypal_verified ? 'PayPal verified' : 'PayPal connected'}
        </span>
      </header>

      <section className="hero-card relative mt-2 overflow-hidden rounded-[1.75rem] p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-white/15 blur-2xl" />
        <p className="text-sm/none opacity-80">Paid through ShipSafe</p>
        {orders.isLoading ? (
          <Skeleton className="mt-3 h-10 w-40 bg-white/25" />
        ) : (
          <p className="money mt-3 text-[2.6rem] font-semibold leading-none">{money(total)}</p>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            ['To ship', toShip],
            ['Protected', protectedCount],
            ['Orders', live.length],
          ].map(([label, n]) => (
            <div key={label} className="rounded-2xl bg-white/15 px-2 py-2.5 backdrop-blur-sm">
              <p className="money text-xl font-semibold">{n}</p>
              <p className="text-[11px] opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link key={a.label} to={a.to} className="group flex flex-col items-center gap-1.5">
            <span className="glass grid size-14 place-items-center rounded-[1.1rem] text-brand transition-transform group-active:scale-95">
              <a.icon className="size-6" />
            </span>
            <span className="text-xs font-medium">{a.label}</span>
          </Link>
        ))}
      </section>

      {needsRefund > 0 && (
        <Link to="/orders?filter=NEEDS_REFUND" className="mt-5 flex items-center justify-between rounded-2xl bg-destructive/10 p-4 text-destructive">
          <span className="text-sm font-medium">
            {needsRefund} buyer{needsRefund > 1 ? 's' : ''} paid after the item sold out. Refund them.
          </span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link to="/orders" className="text-sm font-medium text-brand">See all</Link>
        </div>
        <div className="glass divide-y divide-border/60 overflow-hidden rounded-2xl">
          {orders.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="m-3 h-12" />)}
          {!orders.isLoading && list.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No orders yet. Tap <span className="font-semibold text-brand">+</span> to list your first product.
            </div>
          )}
          {list.slice(0, 5).map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      </section>
    </main>
  )
}
