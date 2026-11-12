import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Copy, Loader2, MapPin, ScanLine, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, money, type SlipResult } from '@/lib/api'
import { cn } from '@/lib/utils'
import { s10Valid } from '@shared/validators'

function Check1({ ok, label, hint }: { ok: boolean | null; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
        ok ? 'bg-success/15 text-success' : ok === false ? 'bg-destructive/12 text-destructive' : 'bg-muted text-muted-foreground')}>
        {ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </li>
  )
}

export default function OrderDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [slip, setSlip] = useState<SlipResult | null>(null)
  const [number, setNumber] = useState('')
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id) })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['order', id] }); qc.invalidateQueries({ queryKey: ['orders'] }) }

  const read = useMutation({
    mutationFn: (f: File) => api.readSlip(id, f),
    onSuccess: (r) => { setSlip(r); setNumber(r.read.tracking_number) },
    onError: (e) => toast.error(`Couldn't read the slip: ${(e as Error).message}`),
  })
  const track = useMutation({
    mutationFn: () => api.track(id, {
      tracking_number: number, carrier: slip?.carrier.carrier ?? 'INDIA_POST_INT',
      carrier_name_other: slip?.carrier.carrier_name_other, slip_key: slip?.slip_key, checks: slip?.checks,
    }),
    onSuccess: (r) => {
      toast.success(r.status === 'PROTECTED' ? 'Tracking sent to PayPal. This sale is protected.' : 'Tracking sent to PayPal.')
      setSlip(null); refresh()
    },
    onError: (e) => toast.error(`PayPal didn't accept it: ${(e as Error).message}`),
  })
  const cancel = useMutation({
    mutationFn: (tid: string) => api.cancelTracker(id, tid),
    onSuccess: () => { toast.success('Tracking number cancelled. Scan the right slip.'); refresh() },
    onError: (e) => toast.error((e as Error).message),
  })
  const refund = useMutation({
    mutationFn: () => api.refund(id),
    onSuccess: () => { toast.success('Refunded. PayPal will email the buyer.'); refresh() },
    onError: (e) => toast.error((e as Error).message),
  })

  if (order.isLoading) return <div className="mx-auto max-w-md space-y-3 p-5 pt-12"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-28 rounded-2xl" /></div>
  const o = order.data
  if (!o) return <p className="p-10 text-center text-muted-foreground">Order not found.</p>

  const address = [o.ship_name, o.ship_line1, o.ship_line2, [o.ship_city, o.ship_state, o.ship_postcode].filter(Boolean).join(' '), o.ship_country].filter(Boolean)
  const active = o.trackers.filter((t) => t.status === 'SHIPPED')
  const numberOk = s10Valid(number)
  const blocking = slip && (!slip.checks.readable || slip.checks.duplicate)

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),16px)]">
      <header className="flex items-center gap-2 py-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => nav(-1)} aria-label="Back"><ArrowLeft /></Button>
        <h1 className="flex-1 truncate text-lg font-semibold">{o.title ?? 'Order'}</h1>
        <StatusBadge status={o.status} />
      </header>

      <section className="hero-card mt-2 rounded-[1.75rem] p-5">
        <p className="text-sm opacity-80">{o.variant ? `Colour: ${o.variant}` : 'Paid with PayPal'}</p>
        <p className="money mt-1 text-4xl font-semibold">{money(o.amount, o.currency)}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-2.5 py-1">Order {o.id}</span>
          {o.buyer_account_status === 'VERIFIED' && <span className="rounded-full bg-white/15 px-2.5 py-1">Buyer verified by PayPal</span>}
          {o.seller_protection && <span className="rounded-full bg-white/15 px-2.5 py-1">Seller protection: {o.seller_protection.toLowerCase().replace('_', ' ')}</span>}
        </div>
      </section>

      <section className="glass mt-4 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="text-sm leading-relaxed">
              <p className="font-medium">Ship to</p>
              {address.map((l) => <p key={l}>{l}</p>)}
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Copy address" onClick={() => { navigator.clipboard.writeText(address.join('\n')); toast.success('Address copied') }}><Copy /></Button>
        </div>
        <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand">
          Ship only to this address. PayPal Seller Protection covers the address on the PayPal transaction.
        </p>
      </section>

      {o.status === 'NEEDS_REFUND' && (
        <section className="mt-4 rounded-2xl bg-destructive/10 p-4">
          <p className="flex items-center gap-2 font-medium text-destructive"><TriangleAlert className="size-4" /> This buyer paid after the item sold out</p>
          <p className="mt-1 text-sm text-muted-foreground">Refund them in full. PayPal emails the buyer.</p>
          <Button variant="destructive" className="mt-3 w-full rounded-full" disabled={refund.isPending} onClick={() => refund.mutate()}>
            {refund.isPending ? <Loader2 className="animate-spin" /> : null} Refund {money(o.amount, o.currency)}
          </Button>
        </section>
      )}

      {active.length > 0 && (
        <section className="glass mt-4 rounded-2xl p-4">
          <p className="flex items-center gap-2 font-medium"><ShieldCheck className="size-5 text-success" /> Tracking on PayPal</p>
          {active.map((t) => (
            <div key={t.id} className="mt-3 flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
              <span>
                <span className="block font-mono text-sm font-semibold">{t.tracking_number}</span>
                <span className="block text-xs text-muted-foreground">{t.carrier.replace(/_/g, ' ')} · buyer emailed by PayPal</span>
              </span>
              <Button variant="ghost" size="sm" className="text-destructive" disabled={cancel.isPending} onClick={() => cancel.mutate(t.id)}>Wrong number?</Button>
            </div>
          ))}
        </section>
      )}

      {(o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'PROTECTED') && !slip && (
        <section className="mt-4">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) read.mutate(f); e.target.value = '' }} />
          <Button size="lg" className="h-14 w-full rounded-full text-base" disabled={read.isPending} onClick={() => fileRef.current?.click()}>
            {read.isPending ? <><Loader2 className="animate-spin" /> Reading the slip</> : <><ScanLine /> {active.length ? 'Scan another slip' : 'Scan courier slip'}</>}
          </Button>
        </section>
      )}

      {slip && (
        <section className="glass mt-4 rounded-2xl p-4">
          <p className="font-medium">Check before sending to PayPal</p>
          <div className="mt-3 space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="num">Tracking number from the slip</label>
            <Input id="num" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} className="h-12 rounded-xl font-mono text-lg tracking-wider" />
          </div>
          <ul className="mt-2 divide-y divide-border/60">
            <Check1 ok={slip.checks.readable} label="Looks like a courier receipt" hint={`${slip.read.carrier} → ${slip.carrier.carrier.replace(/_/g, ' ')}`} />
            <Check1 ok={numberOk} label="Tracking number passes the postal check digit" hint={numberOk ? 'UPU S10 format' : 'Fix any misread character above'} />
            <Check1 ok={slip.checks.address.match} label="Slip matches the PayPal shipping address"
              hint={`${slip.read.destination_city} ${slip.read.destination_postcode}, ${slip.read.destination_country}`} />
            <Check1 ok={!slip.checks.duplicate} label="Not used on another order" hint={slip.checks.duplicate ? `Already on order ${slip.checks.duplicate}` : undefined} />
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-12 rounded-full" onClick={() => setSlip(null)}>Rescan</Button>
            <Button className="h-12 rounded-full" disabled={track.isPending || !!blocking || number.length < 5} onClick={() => track.mutate()}>
              {track.isPending ? <Loader2 className="animate-spin" /> : null} Send to PayPal
            </Button>
          </div>
          {!slip.checks.address.match && !blocking && (
            <p className="mt-3 text-xs text-muted-foreground">The address doesn't match. Only send if you shipped to the PayPal address above.</p>
          )}
        </section>
      )}
    </main>
  )
}
