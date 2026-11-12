import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Loader2, PenLine, Pencil, Send } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Stamp } from '@/components/airmail'
import { AttributeEditor, fallbackFor } from '@/components/AttributeEditor'
import { Textarea } from '@/components/ui/textarea'
import { StatStrip } from '@/components/dashboard'
import { OrderRow } from '@/components/OrderRow'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Attribute, MOCK, money, photoUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { listingState } from './Products'

export default function ProductDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['listing', id], queryFn: () => api.listing(id) })
  const [editing, setEditing] = useState(false)
  const [attrs, setAttrs] = useState<Attribute[]>([])
  const [desc, setDesc] = useState('')
  const clean = () => attrs.map((a) => ({ name: a.name.trim(), value: a.value.trim() })).filter((a) => a.name && a.value)
  const save = useMutation({
    mutationFn: () => api.updateListing(id, { description: desc.trim(), attributes: clean() }),
    onSuccess: (r) => {
      toast.success(r.paypal_updated ? 'Saved. The PayPal link shows the new details.' : 'Saved.')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['listing', id] })
      qc.invalidateQueries({ queryKey: ['listings'] })
    },
    onError: (e) => toast.error(`Couldn't save: ${(e as Error).message}`),
  })
  const rewrite = useMutation({
    mutationFn: () => api.describeListing({ title: q.data!.title, category: q.data!.category ?? undefined, colours: q.data!.colours, attributes: clean(), current: desc }),
    onSuccess: (r) => setDesc(r.description),
    onError: (e) => toast.error(`Couldn't rewrite it: ${(e as Error).message}`),
  })
  const close = useMutation({
    mutationFn: () => api.archiveListing(id),
    onSuccess: () => {
      toast.success('Link closed. Buyers can no longer pay it.')
      qc.invalidateQueries({ queryKey: ['listings'] })
      nav('/products')
    },
    onError: (e) => toast.error((e as Error).message),
  })

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 pt-16">
        <Skeleton className="mx-auto aspect-[4/5] w-3/4 rounded-xs" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    )
  }
  const l = q.data
  if (!l) return <p className="px-6 py-20 text-center text-muted-foreground">This product isn't in your shop.</p>
  const s = listingState(l)
  const share = async () => {
    if (!l.plb_url) return
    const text = `${l.title}, ${money(l.price, l.currency)}. Pay safely with PayPal here:`
    if (navigator.share) await navigator.share({ title: l.title, text, url: l.plb_url }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${l.plb_url}`)}`, '_blank', 'noopener')
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),12px)] lg:max-w-6xl lg:px-10 lg:pt-8">
      <header className="flex items-center gap-1 py-2">
        <Button variant="ghost" size="icon" className="-ml-2 size-11 rounded-full" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">Product</h1>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-14">
      <div>
      <Stamp src={photoUrl(l.photo_key)} alt={l.title} className="mx-auto mt-2 aspect-[4/5] w-[72%] -rotate-1 lg:sticky lg:top-8 lg:w-full" />

      </div>
      <div>
      <section className="mt-6 lg:mt-2">
        <h2 className="text-[24px] lg:text-[32px] font-semibold leading-tight">{l.title}</h2>
        <p className="money mt-2 text-[28px] font-semibold leading-none text-ink">{money(l.price, l.currency)}</p>
        {!editing && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{l.description}</p>}
      </section>

      <div className="mt-5">
        <StatStrip items={[
          { label: 'Sold', value: String(l.sold), note: 'Units paid for' },
          { label: 'Revenue', value: money(l.sold * Number(l.price), l.currency), note: 'Through PayPal' },
          { label: 'Left', value: String(s.left), note: `of ${l.quantity} listed` },
          { label: 'Listed', value: new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), note: l.category ?? 'Product' },
        ]} />
      </div>
      <div className="mb-2 mt-6 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold">Details</h2>
        {!editing && (
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={() => { setAttrs(l.attributes ?? []); setDesc(l.description); setEditing(true) }}>
            <Pencil /> Edit details
          </Button>
        )}
      </div>

      {editing ? (
        <section className="sheet space-y-4 rounded-2xl p-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="pd-desc" className="text-sm font-medium">Description</label>
              <span className="money text-xs text-muted-foreground">{desc.length} of 240</span>
            </div>
            <Textarea id="pd-desc" value={desc} maxLength={240} rows={4} onChange={(e) => setDesc(e.target.value)} className="rounded-lg bg-card text-[16px]" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Product details</p>
            <AttributeEditor value={attrs} onChange={setAttrs} suggestions={fallbackFor(`${l.category ?? ''} ${l.title}`)} />
            {clean().length > 0 && (
              <Button type="button" variant="outline" className="h-10 rounded-lg" disabled={rewrite.isPending} onClick={() => rewrite.mutate()}>
                {rewrite.isPending ? <Loader2 className="animate-spin" /> : <PenLine />} Rewrite description from details
              </Button>
            )}
          </div>
          {s.live && <p className="text-[13px] text-muted-foreground">Saving also updates the live PayPal link, so buyers see these details at checkout. The link stays the same.</p>}
          <div className="grid grid-cols-[auto_1fr] gap-2.5">
            <Button variant="outline" size="lg" className="h-12 rounded-xl" onClick={() => setEditing(false)} disabled={save.isPending}>Cancel</Button>
            <Button size="lg" className="h-12 rounded-xl" onClick={() => save.mutate()} disabled={save.isPending || desc.trim().length < 1}>
              {save.isPending && <Loader2 className="animate-spin" />} Save details
            </Button>
          </div>
        </section>
      ) : (
      <dl className="sheet divide-y divide-border/70 rounded-2xl">
          {(l.attributes ?? []).map((at) => (
            <div key={at.name} className="flex items-start justify-between gap-4 px-4 py-3.5">
              <dt className="text-[15px] text-muted-foreground">{at.name}</dt>
              <dd className="text-right text-[15px] font-medium">{at.value}</dd>
            </div>
          ))}
          <div className="flex items-start justify-between gap-4 px-4 py-3.5">
            <dt className="text-[15px] text-muted-foreground">Colours</dt>
            <dd className="flex flex-wrap justify-end gap-1.5">
              {l.colours.length ? l.colours.map((c) => (
                <span key={c} className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[13px] font-medium">{c}</span>
              )) : <span className="text-[15px] font-medium">One style</span>}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <dt className="text-[15px] text-muted-foreground">PayPal link</dt>
            <dd className={cn('text-[15px] font-medium', s.live ? 'text-success' : 'text-status-refund')}>{s.label}</dd>
          </div>
        </dl>
      )}

      {s.live && l.plb_url && (
        <section className="mt-4">
          <p className="tracking-code break-all rounded-md bg-muted px-3 py-2.5 text-[12px] leading-relaxed">{l.plb_url}</p>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5">
            <Button variant="outline" size="lg" className="h-[52px] rounded-xl" onClick={() => { navigator.clipboard.writeText(l.plb_url!); toast.success('Link copied') }}>
              <Copy /> Copy
            </Button>
            <Button size="lg" className="h-[52px] rounded-xl text-[15px]" onClick={share}><Send /> Send to a chat</Button>
          </div>
        </section>
      )}

      {s.live && l.plb_url && (
        <section className="mt-7">
          <h2 className="mb-2 px-1 text-[15px] font-semibold">How buyers see it in a chat</h2>
          <div className="rounded-2xl bg-[color-mix(in_oklch,var(--paper-deep)_70%,var(--muted))] p-4">
            <div className="ml-auto max-w-[300px] overflow-hidden rounded-2xl rounded-br-sm bg-card shadow-[var(--sheet-shadow)]">
              <div className="flex gap-3 border-b border-border/70 bg-muted/60 p-2.5">
                {photoUrl(l.photo_key) && <img src={photoUrl(l.photo_key)!} alt="" className="size-14 shrink-0 rounded-md object-cover" />}
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[13px] font-semibold">{l.title}</span>
                  <span className="money block text-[13px] text-ink">{money(l.price, l.currency)}</span>
                  <span className="block text-[11px] text-muted-foreground">www.paypal.com</span>
                </span>
              </div>
              <p className="px-3 py-2.5 text-[13px] leading-snug">
                {l.title}, {money(l.price, l.currency)}. Pay safely with PayPal here:{' '}
                <span className="break-all text-brand underline">{l.plb_url}</span>
              </p>
            </div>
            <p className="mt-2 text-right text-[11px] text-muted-foreground">The message Send to a chat writes for you</p>
          </div>
        </section>
      )}

      <section className="mt-7">
        <h2 className="mb-2 px-1 text-[15px] font-semibold">Orders for this product</h2>
        <div className="sheet divide-y divide-border/70 overflow-hidden rounded-2xl">
          {l.orders.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No one has paid this link yet.</p>}
          {l.orders.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      </section>

      {s.live && (
        <Button
          variant="outline"
          size="lg"
          className="mt-6 h-12 w-full rounded-xl text-status-refund"
          disabled={close.isPending || MOCK}
          onClick={() => close.mutate()}
        >
          Close this link
        </Button>
      )}
      </div>
      </div>
    </main>
  )
}
