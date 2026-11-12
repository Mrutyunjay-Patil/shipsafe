import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Camera, Check, ScanLine, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Destination, Envelope, Postmark, postmarkDate, Stamp } from '@/components/airmail'
import { ActivityFeed, ProtectionMeter, SalesChart, SetupChecklist, setupSteps, StatStrip } from '@/components/dashboard'
import { OrderRow, primeSeen } from '@/components/OrderRow'
import { activity, dailySales, hoursToPost, isSale, monthTotals, protection } from '@/lib/insights'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, MOCK, money, type Order, photoUrl, type Seller } from '@/lib/api'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function NextParcel({ o, more }: { o: Order; more: number }) {
  return (
    <Envelope inTransit>
      <div className="relative px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 pt-2">
            <Destination city={o.ship_city} country={o.ship_country} className="block text-[clamp(34px,11vw,44px)] leading-[0.92]" />
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
          {o.variant && <span className="whitespace-nowrap text-muted-foreground"> · {o.variant}</span>}
        </p>
        <Button asChild size="lg" className="mt-5 h-[52px] w-full rounded-xl text-[15px]">
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
    <Envelope>
      <div className="px-5 pb-5 pt-5">
        <p className="label-caps text-[32px] leading-none text-ink">{hasOrders ? 'All posted' : 'First sale'}</p>
        <p className="mt-2 max-w-[30ch] text-[15px] text-muted-foreground">
          {hasOrders
            ? 'Every paid order has tracking on PayPal. List something new while you wait.'
            : 'Photograph a product. ShipSafe writes the listing and makes a PayPal link for your chat.'}
        </p>
        <Button asChild size="lg" className="mt-5 h-[52px] w-full rounded-xl text-[15px]">
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
  const listings = useQuery({ queryKey: ['listings'], queryFn: api.listings })
  const month = monthTotals(list)
  const prot = protection(list)
  const hrs = hoursToPost(list)
  const days = dailySales(list)
  const feed = activity(list, 6)
  const steps = setupSteps((listings.data?.length ?? 0) > 0, list.some(isSale), list.some((o) => o.shipped_at))
  const fmtHours = (h: number) => (h < 24 ? `${Math.round(h)} h` : `${(h / 24).toFixed(1)} days`)
  const name = seller.display_name?.split(' ')[0]

  const statItems = [
    { label: 'Sales this month', value: money(month.cur), note: month.change === null ? `${month.count} orders` : `${month.change >= 0 ? '+' : ''}${Math.round(month.change * 100)}% on last month`, tone: month.change === null ? undefined : month.change >= 0 ? 'up' : 'down' },
    { label: 'Protected', value: `${Math.round(prot.rate * 100)}%`, note: `${prot.done} of ${prot.total} paid orders` },
    { label: 'To post', value: String(prot.waiting), note: prot.waiting ? 'Waiting on you' : 'All posted' },
    { label: 'Time to post', value: hrs === null ? '–' : fmtHours(hrs), note: 'Average after payment' },
  ] as const
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const refundAlert = refunds.length > 0 && (
    <Link
      to="/orders?filter=NEEDS_REFUND"
      className="flex items-center gap-3 rounded-xl border border-[color-mix(in_oklch,var(--status-refund)_30%,transparent)] bg-[color-mix(in_oklch,var(--status-refund)_9%,var(--card))] px-4 py-3.5"
    >
      <TriangleAlert className="size-5 shrink-0 text-status-refund" />
      <span className="flex-1 text-sm">
        <span className="font-semibold">{refunds.length} buyer{refunds.length > 1 ? 's' : ''} paid after it sold out.</span>{' '}
        <span className="text-muted-foreground">Refund in one tap.</span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  )

  const nextParcel = orders.isLoading ? (
    <Skeleton className="h-[330px] rounded-2xl" />
  ) : toPost[0] ? (
    <NextParcel o={toPost[0]} more={toPost.length - 1} />
  ) : (
    <NothingToPost hasOrders={list.length > 0} />
  )

  const inThePost = (
    <section className="flex flex-col">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold">In the post</h2>
        <Link to="/orders" className="text-sm font-medium text-brand">All orders</Link>
      </div>
      <div className="sheet flex-1 divide-y divide-border/70 overflow-hidden rounded-2xl">
        {orders.isLoading && [0, 1].map((i) => <Skeleton key={i} className="m-3 h-12" />)}
        {!orders.isLoading && inPost.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Parcels you post show here until PayPal protects them.</p>
        )}
        {inPost.slice(0, 3).map((o) => <OrderRow key={o.id} order={o} />)}
      </div>
    </section>
  )

  return (
    <main className="mx-auto max-w-md px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] lg:max-w-[1180px] lg:px-10 lg:pt-9">
      <header className="flex items-center justify-between gap-3 pt-2 lg:hidden">
        <span className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-7 rounded-md" />
          <span className="text-[17px] font-bold tracking-[-0.02em] text-ink">ShipSafe</span>
        </span>
        <Link
          to="/account"
          aria-label={`Your shop. ${seller.paypal_verified ? 'PayPal verified' : 'PayPal connected'}`}
          className="relative grid size-10 shrink-0 place-items-center rounded-full bg-ink text-[16px] font-semibold text-paper shadow-[var(--sheet-shadow)] transition-transform duration-150 active:scale-95"
        >
          {(seller.display_name ?? 'S').slice(0, 1).toUpperCase()}
          <span className="absolute -bottom-0.5 -right-0.5 grid size-[17px] place-items-center rounded-full bg-etiquette text-etiquette-foreground ring-2 ring-paper">
            <Check className="size-3" strokeWidth={3.2} />
          </span>
        </Link>
      </header>

      <div className="mt-4 flex items-end justify-between gap-4 lg:mt-0">
        <div className="min-w-0">
          <h1 className="text-[clamp(22px,7vw,28px)] font-semibold leading-tight lg:text-[30px]">
            {greeting()}{name ? `, ${name}` : ''}
          </h1>
          <p className="mt-1 hidden text-[14px] text-muted-foreground lg:block">{today}</p>
        </div>
        <div className="hidden shrink-0 gap-2 lg:flex">
          {toPost[0] && (
            <Button asChild variant="outline" className="h-10 rounded-lg"><Link to={`/orders/${toPost[0].id}`}><ScanLine /> Scan a slip</Link></Button>
          )}
          <Button asChild className="h-10 rounded-lg"><Link to="/sell"><Camera /> List a product</Link></Button>
        </div>
      </div>

      {/* Phone: one column, in the order a seller works. */}
      <div className="mt-4 space-y-4 lg:hidden">
        <SetupChecklist steps={steps} />
        {nextParcel}
        {refundAlert}
        <StatStrip cols={2} items={[...statItems]} />
        <SalesChart days={days} />
        {inThePost}
        <ProtectionMeter p={prot} />
        <ActivityFeed items={feed} />
      </div>

      {/* Wide screens: a 12-column dashboard. */}
      <div className="mt-6 hidden grid-cols-12 gap-5 lg:grid">
        {refundAlert && <div className="col-span-12">{refundAlert}</div>}
        <div className="col-span-12"><StatStrip items={[...statItems]} /></div>
        <div className="col-span-5 [&>section]:mt-0">{nextParcel}</div>
        <div className="col-span-7 flex [&>figure]:flex-1"><SalesChart days={days} tall /></div>
        <div className="col-span-5 flex flex-col">{inThePost}</div>
        <div className="col-span-4 flex flex-col pt-[34px] [&>section]:flex-1"><ActivityFeed items={feed.slice(0, 5)} /></div>
        <div className="col-span-3 flex flex-col gap-5 pt-[34px] [&>section:first-child]:flex-1">
          <ProtectionMeter p={prot} />
          <SetupChecklist steps={steps} />
        </div>
      </div>
    </main>
  )
}
