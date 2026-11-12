import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Copy, ImageUp, Loader2, ScanLine, TriangleAlert, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { carrierName, Destination, Envelope, ShippedSafe, Postmark, postmarkDate, sentenceCase, Stamp } from '@/components/airmail'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, money, photoUrl, type SlipResult } from '@/lib/api'
import { cn } from '@/lib/utils'
import { s10Valid } from '@shared/validators'

function CheckLine({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={cn(
          'mt-px grid size-[22px] shrink-0 place-items-center rounded-full',
          ok ? 'bg-[color-mix(in_oklch,var(--success)_16%,transparent)] text-success' : 'bg-[color-mix(in_oklch,var(--status-refund)_14%,transparent)] text-status-refund',
        )}
      >
        {ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
        <span className="sr-only">{ok ? 'Passed' : 'Failed'}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium leading-snug">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-muted-foreground">{hint}</span>}
      </span>
    </li>
  )
}

const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function OrderDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [slip, setSlip] = useState<SlipResult | null>(null)
  const [number, setNumber] = useState('')
  const [justStamped, setJustStamped] = useState(false)
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id) })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['order', id] })
    qc.invalidateQueries({ queryKey: ['orders'] })
  }

  const read = useMutation({
    mutationFn: (f: File) => api.readSlip(id, f),
    onSuccess: (r) => { setSlip(r); setNumber(r.read.tracking_number) },
    onError: (e) => toast.error(`Couldn't read that slip. ${(e as Error).message}. Try a sharper photo in good light.`),
  })
  const track = useMutation({
    mutationFn: () =>
      api.track(id, {
        tracking_number: number, carrier: slip?.carrier.carrier ?? 'INDIA_POST_INT',
        carrier_name_other: slip?.carrier.carrier_name_other, slip_key: slip?.slip_key, checks: slip?.checks,
      }),
    onSuccess: () => {
      setSlip(null)
      setJustStamped(true)
      refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: (e) => toast.error(`PayPal didn't accept that number: ${(e as Error).message}`),
  })
  const cancel = useMutation({
    mutationFn: (tid: string) => api.cancelTracker(id, tid),
    onSuccess: () => { setJustStamped(false); toast.success('Tracking cancelled on PayPal. Scan the right slip.'); refresh() },
    onError: (e) => toast.error((e as Error).message),
  })
  const refund = useMutation({
    mutationFn: () => api.refund(id),
    onSuccess: () => { toast.success('Refunded in full. PayPal has emailed the buyer.'); refresh() },
    onError: (e) => toast.error((e as Error).message),
  })

  if (order.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-5 pt-16">
        <Skeleton className="h-[300px] rounded-2xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    )
  }
  const o = order.data
  if (!o) return <p className="px-6 py-20 text-center text-muted-foreground">This order isn't in your shop.</p>

  const active = o.trackers.filter((t) => t.status === 'SHIPPED')
  const firstTracker = [...active].sort((x, y) => x.created_at.localeCompare(y.created_at))[0]
  const journey = [
    { label: 'Paid with PayPal', at: o.paid_at, note: money(o.amount, o.currency), pending: '' },
    { label: 'Posted', at: o.shipped_at, note: firstTracker ? carrierName(firstTracker.carrier) : undefined, pending: 'Post it and scan the courier slip' },
    { label: 'Tracking on PayPal', at: firstTracker?.created_at ?? null, note: firstTracker ? `${firstTracker.tracking_number}, buyer emailed` : undefined, pending: 'Sent when you confirm the slip' },
    { label: 'Shipped safe', at: o.status === 'PROTECTED' ? (firstTracker?.created_at ?? o.shipped_at) : null, note: 'Seller Protection has its proof', pending: o.status === 'REFUNDED' ? 'Refunded, no longer needed' : 'Once PayPal has the tracking' },
  ]
  const posted = active.length > 0
  const protectedNow = o.status === 'PROTECTED'
  const numberOk = s10Valid(number)
  const blocked = !!slip && (!slip.checks.readable || !!slip.checks.duplicate)
  const canShip = o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'PROTECTED'
  const addressText = [o.ship_name, o.ship_line1, o.ship_line2, [o.ship_city, o.ship_state, o.ship_postcode].filter(Boolean).join(' '), o.ship_country]
    .filter(Boolean)
    .join('\n')

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),12px)] lg:max-w-6xl lg:px-10 lg:pt-8">
      <header className="flex items-center gap-1 py-2">
        <Button variant="ghost" size="icon" className="-ml-2 size-11 rounded-full" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">Order to {o.ship_city ?? o.ship_country ?? "your buyer"}</h1>
        <StatusBadge status={o.status} short className="shrink-0" />
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div>
      <Envelope inTransit={o.status !== 'REFUNDED'} className="mt-1">
        <div className="relative px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Destination city={o.ship_city} country={o.ship_country} className="block text-[clamp(34px,11vw,44px)] leading-[0.92]" />
              <p className="money mt-3 text-[28px] font-semibold leading-none">{money(o.amount, o.currency)}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{o.title}{o.variant && <span className="whitespace-nowrap"> · {o.variant}</span>}</p>
            </div>
            <Stamp src={photoUrl(o.photo_key)} className="h-[86px] w-[72px] rotate-[3deg]" />
          </div>

          {(posted || protectedNow) && (
            <div className="pointer-events-none mt-4 flex items-center gap-2" aria-label={protectedNow ? 'Posted and protected by PayPal' : 'Posted'}>
              <Postmark
                key={justStamped ? 'struck' : 'still'}
                city={o.ship_city ?? 'ShipSafe'}
                date={postmarkDate(o.shipped_at ?? o.paid_at)}
                waves={false}
                className={cn('size-[68px] -rotate-[10deg]', justStamped && 'strike')}
              />
              {protectedNow && <ShippedSafe className={cn('-rotate-2', justStamped && 'settle')} />}
            </div>
          )}

          <div className="mt-5 flex items-start justify-between gap-3 border-t border-dashed border-border pt-4">
            <address className="text-[15px] not-italic leading-snug">
              <span className="block font-semibold">{o.ship_name}</span>
              <span className="block text-muted-foreground">{o.ship_line1}</span>
              {o.ship_line2 && <span className="block text-muted-foreground">{o.ship_line2}</span>}
              <span className="block text-muted-foreground">{[o.ship_city, o.ship_state, o.ship_postcode].filter(Boolean).join(' ')}</span>
              <span className="block text-muted-foreground">{o.ship_country}</span>
            </address>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => { navigator.clipboard.writeText(addressText); toast.success('Address copied') }}
            >
              <Copy /> Copy
            </Button>
          </div>
          <p className="mt-3 text-[13px] leading-snug text-muted-foreground">
            Post only to this address. Seller Protection covers the address on the PayPal transaction.
          </p>
        </div>
      </Envelope>


      </div>
      <div>
      {o.status === 'NEEDS_REFUND' && (
        <section className="mt-5 rounded-xl border border-[color-mix(in_oklch,var(--status-refund)_30%,transparent)] bg-[color-mix(in_oklch,var(--status-refund)_8%,var(--card))] p-4">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4 text-status-refund" /> This buyer paid after it sold out</p>
          <p className="mt-1 text-sm text-muted-foreground">Refund them in full. PayPal emails the buyer and the money goes back the same way it came.</p>
          <Button variant="destructive" size="lg" className="mt-4 h-12 w-full rounded-xl" disabled={refund.isPending} onClick={() => refund.mutate()}>
            {refund.isPending && <Loader2 className="animate-spin" />} Refund {money(o.amount, o.currency)}
          </Button>
        </section>
      )}

      {posted && (
        <section className="mt-5">
          <h2 className="mb-2 px-1 text-[15px] font-semibold">Tracking on PayPal</h2>
          <div className="sheet divide-y divide-border/70 rounded-2xl">
            {active.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="tracking-code block truncate text-[16px] font-semibold">{t.tracking_number}</span>
                  <span className="block text-[12px] text-muted-foreground">{carrierName(t.carrier)} · buyer emailed by PayPal</span>
                </span>
                <Button variant="outline" size="sm" className="shrink-0 rounded-full" disabled={cancel.isPending} onClick={() => cancel.mutate(t.id)}>
                  Fix number
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {canShip && !slip && (
        <section className="mt-5">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) read.mutate(f); e.target.value = '' }} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) read.mutate(f); e.target.value = '' }} />
          <div className="grid grid-cols-[1fr_auto] gap-2.5">
            <Button
              size="lg"
              variant={posted ? 'outline' : 'default'}
              className="h-[52px] rounded-xl text-[15px]"
              disabled={read.isPending}
              onClick={() => cameraRef.current?.click()}
            >
              {read.isPending ? <><Loader2 className="animate-spin" /> Reading the slip</> : <><ScanLine /> {posted ? 'Scan another slip' : 'Scan the courier slip'}</>}
            </Button>
            <Button size="lg" variant="outline" className="h-[52px] rounded-xl" disabled={read.isPending} onClick={() => fileRef.current?.click()} aria-label="Upload a slip photo from the gallery">
              <ImageUp /> Gallery
            </Button>
          </div>
          {!posted && (
            <p className="mt-2 px-1 text-center text-[13px] text-muted-foreground">Snap it at the counter, or pick a photo you already took. You'll check everything before PayPal sees it.</p>
          )}
        </section>
      )}

      {slip && (
        <section className="sheet mt-5 rounded-2xl p-4">
          <h2 className="text-[17px] font-semibold">Check before PayPal sees it</h2>
          <label className="mt-3 block text-[13px] text-muted-foreground" htmlFor="num">Tracking number, as read from the slip</label>
          <Input
            id="num"
            value={number}
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => setNumber(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            className="tracking-code mt-1.5 h-14 rounded-lg bg-card text-[20px] font-semibold"
          />
          <ul className="mt-2 divide-y divide-border/70">
            <CheckLine ok={slip.checks.readable} label="It's a courier receipt" hint={`Sent to PayPal as ${carrierName(slip.carrier.carrier, slip.carrier.carrier_name_other)}`} />
            <CheckLine ok={numberOk} label="The number passes the postal check digit" hint={numberOk ? 'International S10 format' : 'Fix any misread letter or digit above'} />
            <CheckLine
              ok={slip.checks.address.match}
              label="The slip goes to the PayPal address"
              hint={`Slip says ${slip.read.destination_city} ${slip.read.destination_postcode}, ${slip.read.destination_country}`}
            />
            <CheckLine ok={!slip.checks.duplicate} label="Not used on another order" hint={slip.checks.duplicate ? `Already on order ${slip.checks.duplicate}` : undefined} />
          </ul>
          {!slip.checks.address.match && !blocked && (
            <p className="mt-2 text-[13px] text-muted-foreground">The address doesn't match. Only send it if you really posted to the address above.</p>
          )}
          <div className="mt-4 grid grid-cols-[auto_1fr] gap-2.5">
            <Button variant="outline" size="lg" className="h-[52px] rounded-xl" onClick={() => setSlip(null)}>Rescan</Button>
            <Button size="lg" className="h-[52px] rounded-xl text-[15px]" disabled={track.isPending || blocked || number.length < 8} onClick={() => track.mutate()}>
              {track.isPending && <Loader2 className="animate-spin" />} Send tracking to PayPal
            </Button>
          </div>
        </section>
      )}
      <div className="lg:mt-1">
      <section className="sheet mt-5 rounded-2xl p-4">
        <h2 className="text-[15px] font-semibold">Journey</h2>
        <ol className="mt-3">
          {journey.map((j, i) => (
            <li key={j.label} className="relative flex gap-3 pb-4 last:pb-0">
              {i < journey.length - 1 && <span aria-hidden="true" className={cn('absolute left-[11px] top-6 h-[calc(100%-16px)] w-[2px] rounded-full', j.at ? 'bg-ink/40' : 'bg-border')} />}
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-full', j.at ? 'bg-ink text-paper' : 'border-2 border-dashed border-border text-muted-foreground')}>
                {j.at ? <Check className="size-3.5" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-border" />}
              </span>
              <span className="min-w-0 flex-1 leading-snug">
                <span className={cn('block text-[14px] font-medium', !j.at && 'text-muted-foreground')}>{j.label}</span>
                <span className="block text-[12px] text-muted-foreground">{j.at ? `${fmtWhen(j.at)}${j.note ? ` · ${j.note}` : ''}` : j.pending}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="sheet mt-4 divide-y divide-border/70 rounded-2xl">
        <h2 className="px-4 pb-2 pt-4 text-[15px] font-semibold">PayPal details</h2>
        {[
          ['Buyer account', o.buyer_account_status === 'VERIFIED' ? 'Verified by PayPal' : 'Not verified', null],
          ['Seller protection', o.seller_protection ? sentenceCase(o.seller_protection) : 'Not reported', null],
          ['Order ID', o.id, o.id],
          ['Capture ID', o.capture_id, o.capture_id],
        ].map(([k, v, copy]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
            <span className="text-muted-foreground">{k}</span>
            {copy ? (
              <button className="tracking-code inline-flex min-w-0 items-center gap-1.5 truncate text-[12px] hover:text-brand" onClick={() => { navigator.clipboard.writeText(copy); toast.success(`${k} copied`) }}>
                <span className="truncate">{v}</span> <Copy className="size-3.5 shrink-0" />
              </button>
            ) : (
              <span className="font-medium">{v}</span>
            )}
          </div>
        ))}
      </section>
      </div>
      </div>
      </div>
    </main>
  )
}
