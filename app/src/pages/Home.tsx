import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Camera, ScanLine, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Destination, Envelope, Postmark, postmarkDate, Stamp } from '@/components/airmail'
import { OrderRow, primeSeen } from '@/components/OrderRow'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, MOCK, money, type Order, photoUrl, type Seller } from '@/lib/api'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function NextParcel({ o, more }: { o: Order; more: number }) {
  return (
    <Envelope inTransit className="mt-4">
      <div className="relative px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 pt-2">
            <Destination city={o.ship_city} country={o.ship_country} className="block text-[clamp(34px,11vw,44px)] leading-[0.92] [overflow-wrap:anywhere]" />
            <address className="mt-4 text-[15px] not-italic leading-snug">
              <span className="block font-semibold">{o.ship_name}</span>
              <span className="block text-muted-foreground">{o.ship_line1}</span>
              <span className="block text-muted-foreground">{[o.ship_city, o.ship_state, o.ship_postcode].filter(Boolean).join(' ')}</span>
            </address>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <Stamp src={photoUrl(o.photo_key)} className="h-[86px] w-[72px] rotate-[3deg]" />
            <Postmark city="Paid" date={postmarkDate(o.paid_at)} waves={false} className="pointer-events-none -mt-3 ml-6 size-[60px] -rotate-[12deg]" />
          </div>
        </div>
        <p className="mt-3 text-sm">
          {o.title}
          {o.variant && <span className="text-muted-foreground"> · {o.variant}</span>}
        </p>
        <Button asChild size="lg" className="mt-5 h-[52px] w-full rounded-[14px] text-[15px]">
          <Link to={`/orders/${o.id}`}><ScanLine /> Post it and scan the slip</Link>
        </Button>
        {more > 0 && (
          <p className="mt-3 text-center text-[13px] text-muted-foreground">
            {more} more parcel{more > 1 ? 's' : ''} to post after this one
          </p>
        )}
      </div>
    </Envelope>
  )
}

function NothingToPost({ hasOrders }: { hasOrders: boolean }) {
  return (
    <Envelope className="mt-4">
      <div className="px-5 pb-5 pt-5">
        <p className="label-caps text-[32px] leading-none text-ink">{hasOrders ? 'All posted' : 'First sale'}</p>
        <p className="mt-2 max-w-[30ch] text-[15px] text-muted-foreground">
          {hasOrders
            ? 'Every paid order has tracking on PayPal. List something new while you wait.'
            : 'Photograph a product. ShipSafe writes the listing and makes a PayPal link for your chat.'}
        </p>
        <Button asChild size="lg" className="mt-5 h-[52px] w-full rounded-[14px] text-[15px]">
          <Link to="/sell"><Camera /> List a product</Link>
        </Button>
      </div>
    </Envelope>
  )
}

export default function Home({ seller }: { seller: Seller }) {
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders, refetchInterval: MOCK ? 4_000 : 20_000 })
  if (orders.data) primeSeen(orders.data.map((o) => o.id))
  const list = orders.data ?? []
  const toPost = list.filter((o) => o.status === 'PAID').sort((a, b) => a.paid_at.localeCompare(b.paid_at))
  const refunds = list.filter((o) => o.status === 'NEEDS_REFUND')
  const inPost = list.filter((o) => o.status === 'SHIPPED' || o.status === 'PROTECTED')
  const live = list.filter((o) => o.status !== 'REFUNDED' && o.status !== 'NEEDS_REFUND')
  const total = live.reduce((s, o) => s + Number(o.amount), 0)
  const protectedN = list.filter((o) => o.status === 'PROTECTED').length
  const name = seller.display_name?.split(' ')[0]

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="flex items-center justify-between gap-3 pt-3">
        <h1 className="text-[26px] font-semibold leading-tight">
          {greeting()}{name ? `, ${name}` : ''}
        </h1>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-ink"
          title={seller.paypal_verified ? 'PayPal says this account is verified' : 'You signed in with PayPal'}
        >
          <ShieldCheck className="size-3.5" />
          {seller.paypal_verified ? 'PayPal verified' : 'PayPal connected'}
        </span>
      </header>

      {orders.isLoading ? (
        <Skeleton className="mt-4 h-[330px] rounded-2xl" />
      ) : toPost[0] ? (
        <NextParcel o={toPost[0]} more={toPost.length - 1} />
      ) : (
        <NothingToPost hasOrders={list.length > 0} />
      )}

      {refunds.length > 0 && (
        <Link
          to="/orders?filter=NEEDS_REFUND"
          className="mt-3 flex items-center gap-3 rounded-[14px] border border-[color-mix(in_oklch,var(--status-refund)_30%,transparent)] bg-[color-mix(in_oklch,var(--status-refund)_9%,var(--card))] px-4 py-3.5"
        >
          <TriangleAlert className="size-5 shrink-0 text-status-refund" />
          <span className="flex-1 text-sm">
            <span className="font-semibold">{refunds.length} buyer{refunds.length > 1 ? 's' : ''} paid after it sold out.</span>{' '}
            <span className="text-muted-foreground">Refund in one tap.</span>
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      <section className="mt-8">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">In the post</h2>
          <Link to="/orders" className="text-sm font-medium text-brand">All orders</Link>
        </div>
        <div className="sheet divide-y divide-border/70 overflow-hidden rounded-2xl">
          {orders.isLoading && [0, 1].map((i) => <Skeleton key={i} className="m-3 h-12" />)}
          {!orders.isLoading && inPost.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Parcels you post show here until PayPal protects them.</p>
          )}
          {inPost.slice(0, 4).map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      </section>

      {live.length > 0 && (
        <p className="mt-5 px-1 text-[13px] text-muted-foreground">
          <span className="money font-semibold text-foreground">{money(total)}</span> paid through PayPal across {live.length} order
          {live.length > 1 ? 's' : ''}, {protectedN} protected.
        </p>
      )}
    </main>
  )
}
