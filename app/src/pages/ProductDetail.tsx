import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Loader2, Minus, PenLine, Pencil, Plus, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Stamp } from '@/components/airmail'
import { AttributeEditor, fallbackFor } from '@/components/AttributeEditor'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { type PhotoItem, PhotoStrip, storedPhoto, uploadPhotos } from '@/components/PhotoStrip'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatStrip } from '@/components/dashboard'
import { OrderRow } from '@/components/OrderRow'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Attribute, type Listing, type ListingDetail, type ListingPatchResult, money, photoUrl } from '@/lib/api'
import { backOr, cn } from '@/lib/utils'
import { clipText, DESC_MAX, fitDetails } from '@shared/listing'
import { BuyerLinks } from '@/components/BuyerLinks'
import { copyLinkOnly, copyMessage, sendMessage, shopMessage } from '@/lib/share'
import { listingState } from './Products'

type Draft = { title: string; price: string; qty: number; colours: string[]; desc: string; attrs: Attribute[] }

const draftOf = (l: ListingDetail): Draft => ({
  title: l.title, price: l.price, qty: l.quantity, colours: l.colours, desc: l.description, attrs: l.attributes ?? [],
})
const cleanAttrs = (a: Attribute[]) => a.map((x) => ({ name: x.name.trim(), value: x.value.trim() })).filter((x) => x.name && x.value)
// Same shape the server stores, so "nothing changed" means the save would be a no-op.
const canon = (d: Draft) => JSON.stringify({
  t: d.title.trim(), p: Number(d.price).toFixed(2), q: d.qty, c: d.colours, d: d.desc.trim(), a: cleanAttrs(d.attrs),
})
const priceError = (p: string) =>
  !/^\d{1,5}(\.\d{1,2})?$/.test(p) ? 'Use a price like 24 or 24.50.'
    : Number(p) <= 0 ? 'The price must be more than 0.'
      : Number(p) > 10000 ? 'The price can be at most 10,000.' : null

const SAVED: Record<ListingPatchResult['paypal'], string> = {
  updated: 'Saved. Buyers see the changes on the PayPal link.',
  relisted: 'Back on sale with a new PayPal link. The old link no longer works, so send buyers this one.',
  closed: 'Saved. Every unit is sold, so the PayPal link is now closed.',
  none: 'Saved.',
}

export default function ProductDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['listing', id], queryFn: () => api.listing(id) })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [colour, setColour] = useState('')
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [shown, setShown] = useState(0)
  const [stage, setStage] = useState<'photo' | 'save' | null>(null)
  const [ask, setAsk] = useState<'discard' | 'close' | null>(null)
  const uploads = useRef(new Map<File, string>())
  const editing = draft !== null
  const l = q.data

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  const photosChanged = !!l && editing && photos.map((p) => p.key ?? p.id).join() !== l.photos.join()
  const dirty = !!(l && draft && (photosChanged || canon(draft) !== canon(draftOf(l))))

  // Guard unsaved edits: in-app navigation asks first, a reload or tab close gets the browser prompt.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && stage === null && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const startEdit = () => {
    if (!l) return
    setDraft(draftOf(l)); setColour('')
    setPhotos(l.photos.map((k) => storedPhoto(k, photoUrl(k) ?? '')))
  }
  const stopEdit = () => { setDraft(null); setPhotos([]); setColour(''); setShown(0) }
  const cancel = () => (dirty ? setAsk('discard') : stopEdit())

  const addColour = () => {
    const c = colour.trim().replace(/\s+/g, ' ')
    setColour('')
    if (!draft || !c) return
    if (draft.colours.some((x) => x.toLowerCase() === c.toLowerCase())) return toast.message(`${c} is already on the list.`)
    if (draft.colours.length >= 10) return toast.message('PayPal allows up to 10 colours.')
    set('colours', [...draft.colours, c.slice(0, 40)])
  }

  const save = useMutation({
    mutationFn: async () => {
      const d = draft!
      let keys: string[] | undefined
      if (photosChanged) {
        if (photos.some((p) => !p.key)) setStage('photo')
        keys = await uploadPhotos(photos, uploads.current)
      }
      setStage('save')
      return api.updateListing(id, {
        title: d.title.trim(), description: d.desc.trim(), price: d.price, colours: d.colours, quantity: d.qty, attributes: cleanAttrs(d.attrs), photos: keys,
      })
    },
    onSuccess: (r) => {
      toast.success(SAVED[r.paypal], { duration: r.paypal === 'relisted' ? 8000 : 4000 })
      uploads.current.clear()
      stopEdit()
      qc.invalidateQueries({ queryKey: ['listing', id] })
      qc.invalidateQueries({ queryKey: ['listings'] })
    },
    onError: (e) => {
      toast.error(`Couldn't save. ${(e as Error).message}`)
      // Something may have changed meanwhile, such as a new sale. Refresh what the page knows.
      qc.invalidateQueries({ queryKey: ['listing', id] })
    },
    onSettled: () => setStage(null),
  })
  const rewrite = useMutation({
    mutationFn: () => api.describeListing({ title: draft!.title, category: l?.category ?? undefined, colours: draft!.colours, attributes: cleanAttrs(draft!.attrs), current: draft!.desc }),
    onSuccess: (r) => set('desc', clipText(r.description)),
    onError: (e) => toast.error(`Couldn't rewrite it. ${(e as Error).message}`),
  })
  const close = useMutation({
    mutationFn: () => api.archiveListing(id),
    onSuccess: () => {
      toast.success('Link closed. Buyers can no longer pay it.')
      qc.setQueryData<Listing[]>(['listings'], (ls) => ls?.filter((x) => x.id !== id))
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['listing', id] })
      nav('/products')
    },
    onError: (e) => toast.error(`Couldn't close it. ${(e as Error).message}`),
  })

  // What the seller should know before saving, worked out from the draft.
  const checks = useMemo(() => {
    if (!l || !draft) return null
    const sold = l.sold
    const wasLive = l.status === 'ACTIVE' && l.quantity > sold
    const names = cleanAttrs(draft.attrs).map((a) => a.name.toLowerCase())
    const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))]
    const paidColours = new Set(l.orders.map((o) => o.variant).filter(Boolean) as string[])
    const removedPaid = l.colours.filter((c) => !draft.colours.includes(c) && paidColours.has(c))
    return {
      title: draft.title.trim().length < 3 ? 'The title needs at least 3 characters.' : null,
      price: priceError(draft.price),
      desc: draft.desc.trim().length < 1 ? 'Write a line about the product.' : null,
      stock:
        wasLive && draft.qty <= sold ? `Every unit is sold at ${draft.qty}, so saving closes the PayPal link.`
          : !wasLive && l.status !== 'ARCHIVED' && draft.qty > sold ? 'Saving makes a new PayPal link, because PayPal deleted the old one when it sold out.'
            : !wasLive && draft.qty <= sold ? 'Add stock to sell it again.' : null,
      dupes: dupes.length ? `Two details share a name (${dupes.join(', ')}). Saving joins their values.` : null,
      removedPaid: removedPaid.length ? `Orders already paid in ${removedPaid.join(' and ')} keep that colour.` : null,
      priceChange: wasLive && Number(draft.price) !== Number(l.price) && l.sold > 0 ? 'Buyers who already paid keep the price they paid.' : null,
      oneColour: draft.colours.length === 1 ? 'With one colour, buyers have nothing to pick on PayPal.' : null,
    }
  }, [l, draft])
  const invalid = !!(checks && (checks.title || checks.price || checks.desc))

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 pt-16">
        <Skeleton className="mx-auto aspect-[4/5] w-3/4 rounded-xs" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    )
  }
  if (!l) return <p className="px-6 py-20 text-center text-muted-foreground">This product isn't in your shop.</p>
  const s = listingState(l)
  const message = l.plb_url ? shopMessage(l, l.plb_url) : ''

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),12px)] lg:max-w-6xl lg:px-10 lg:pt-8">
      <header className="flex items-center gap-1 py-2">
        <Button variant="ghost" size="icon" className="-ml-2 size-11 rounded-full" onClick={() => backOr(nav, "/products")} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">Product</h1>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-14">
      <div className="lg:sticky lg:top-8">
      {(() => {
        const urls = editing ? photos.map((p) => p.url) : l.photos.map((k) => photoUrl(k))
        const i = editing ? 0 : Math.min(shown, Math.max(0, urls.length - 1))
        return (
          <>
            <div className="relative mx-auto mt-2 w-[72%] lg:w-full">
              <Stamp src={urls[i] ?? photoUrl(l.photo_key)} alt={l.title} className={cn('aspect-[4/5] w-full -rotate-1 transition-opacity', stage === 'photo' && 'opacity-60')} />
              {stage === 'photo' && (
                <span className="absolute inset-0 grid place-items-center" role="status">
                  <span className="inline-flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 text-[13px] font-medium shadow-[var(--sheet-shadow)]">
                    <Loader2 className="size-4 animate-spin" /> Uploading photos
                  </span>
                </span>
              )}
              {!editing && urls.length > 1 && (
                <span className="money absolute bottom-3 right-3 rounded-full bg-card/90 px-2 py-0.5 text-[12px] font-semibold">{i + 1} / {urls.length}</span>
              )}
            </div>
            {!editing && urls.length > 1 && (
              <div className="mx-auto mt-4 grid w-[72%] grid-cols-6 gap-1.5 p-0.5 lg:w-full" role="tablist" aria-label="Product photos">
                {urls.map((u, j) => (
                  <button key={j} type="button" role="tab" aria-selected={j === i} aria-label={`Photo ${j + 1}`} onClick={() => setShown(j)}
                    className={cn('aspect-square overflow-hidden rounded-md ring-offset-1 ring-offset-background transition', j === i ? 'ring-2 ring-brand' : 'opacity-60 hover:opacity-100')}>
                    {u && <img src={u} alt="" className="size-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </>
        )
      })()}
      {editing && (
        <div className="mx-auto mt-4 w-[72%] lg:w-full">
          <PhotoStrip items={photos} onChange={setPhotos} disabled={save.isPending} />
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">PayPal's checkout page has no photos, so buyers there see the title and details.</p>
        </div>
      )}
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
        <h2 className="text-[15px] font-semibold">{editing ? 'Edit product' : 'Details'}</h2>
        {!editing && l.status !== 'ARCHIVED' && (
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={startEdit}>
            <Pencil /> Edit product
          </Button>
        )}
      </div>

      {editing && draft && checks ? (
        <section className="sheet space-y-4 rounded-2xl p-4" aria-busy={save.isPending}>
          <fieldset disabled={save.isPending} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="pd-title" className="text-sm font-medium">Title</label>
              {draft.title.length > 100 && <span className="money text-xs text-muted-foreground">{draft.title.length} of 127</span>}
            </div>
            <Input id="pd-title" value={draft.title} maxLength={127} aria-invalid={!!checks.title} aria-describedby="pd-title-hint"
              onChange={(e) => set('title', e.target.value)} className="h-12 rounded-lg bg-card text-[16px]" />
            {checks.title && <p id="pd-title-hint" className="text-[12px] text-destructive">{checks.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="pd-price" className="text-sm font-medium">Price in {l.currency}</label>
              <Input id="pd-price" inputMode="decimal" value={draft.price} aria-invalid={!!checks.price} aria-describedby="pd-price-hint"
                onChange={(e) => set('price', e.target.value.replace(',', '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                onBlur={() => { if (!priceError(draft.price)) set('price', Number(draft.price).toFixed(2)) }}
                className="money h-12 rounded-lg bg-card text-[20px] font-semibold" />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium" id="pd-qty-label">Units in stock</span>
              <div className="flex h-12 items-center justify-between rounded-lg border border-input bg-card px-1" role="group" aria-labelledby="pd-qty-label">
                <Button type="button" variant="ghost" size="icon" aria-label="One fewer" disabled={draft.qty <= Math.max(1, l.sold)} onClick={() => set('qty', Math.max(1, l.sold, draft.qty - 1))}><Minus /></Button>
                <span className="money text-[20px] font-semibold" aria-live="polite">{draft.qty}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="One more" disabled={draft.qty >= 100} onClick={() => set('qty', Math.min(100, draft.qty + 1))}><Plus /></Button>
              </div>
            </div>
            <div className="col-span-2 -mt-1 space-y-1 empty:hidden">
              {checks.price && <p id="pd-price-hint" className="text-[12px] text-destructive">{checks.price}</p>}
              {!checks.price && checks.priceChange && <p className="text-[12px] text-muted-foreground">{checks.priceChange}</p>}
              {l.sold > 0 && <p className="text-[12px] text-muted-foreground">{l.sold} already sold, so stock starts at {l.sold}.</p>}
              {checks.stock && <p className="text-[12px] font-medium text-ink">{checks.stock}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="pd-colour" className="text-sm font-medium">Colours the buyer picks from</label>
            <div className="flex flex-wrap items-center gap-2">
              {draft.colours.map((c) => (
                <span key={c} className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card pl-3.5 pr-1.5 text-sm font-medium">
                  {c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => set('colours', draft.colours.filter((x) => x !== c))} className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              {draft.colours.length < 10 && (
                <Input
                  id="pd-colour"
                  value={colour}
                  maxLength={40}
                  placeholder={draft.colours.length ? 'Add a colour' : 'One style. Add a colour'}
                  onChange={(e) => setColour(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColour() } }}
                  onBlur={addColour}
                  className="h-9 w-44 rounded-full bg-card"
                />
              )}
            </div>
            {(checks.removedPaid || checks.oneColour) && (
              <p className="text-[12px] text-muted-foreground">{[checks.removedPaid, checks.oneColour].filter(Boolean).join(' ')}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="pd-desc" className="text-sm font-medium">Description</label>
              <span className="money text-xs text-muted-foreground">{draft.desc.length} of {DESC_MAX}</span>
            </div>
            <Textarea id="pd-desc" value={draft.desc} maxLength={DESC_MAX} rows={6} aria-invalid={!!checks.desc}
              onChange={(e) => set('desc', e.target.value)} className="rounded-lg bg-card text-[16px]" />
            {checks.desc && <p className="text-[12px] text-destructive">{checks.desc}</p>}
            {(() => { const n = fitDetails(draft.desc, cleanAttrs(draft.attrs)).left; return n > 0 && <p className="text-[12px] text-ink">The description is long enough that {n === 1 ? '1 detail' : `${n} details`} won't fit on PayPal's page. Shorten it to show them all.</p> })()}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Product details</p>
            <AttributeEditor value={draft.attrs} onChange={(v) => set('attrs', v)} suggestions={fallbackFor(l.category, draft.title)} />
            {checks.dupes && <p className="text-[12px] text-muted-foreground">{checks.dupes}</p>}
            {cleanAttrs(draft.attrs).length > 0 && (
              <Button type="button" variant="outline" className="h-10 rounded-lg" disabled={rewrite.isPending} onClick={() => rewrite.mutate()}>
                {rewrite.isPending ? <Loader2 className="animate-spin" /> : <PenLine />} Rewrite description from details
              </Button>
            )}
          </div>
          </fieldset>
          {s.live && <p className="text-[13px] text-muted-foreground">Saving also updates the live PayPal link. The link stays the same, and orders already paid don't change.</p>}
          <div className="grid grid-cols-[auto_1fr] gap-2.5">
            <Button variant="outline" size="lg" className="h-12 rounded-xl" onClick={cancel} disabled={save.isPending}>Cancel</Button>
            <Button size="lg" className="h-12 rounded-xl" onClick={() => save.mutate()} disabled={save.isPending || !dirty || invalid}>
              {save.isPending && <Loader2 className="animate-spin" />}
              {stage === 'photo' ? 'Uploading photos' : stage === 'save' ? 'Saving' : dirty ? 'Save changes' : 'No changes yet'}
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

      {s.live && l.plb_url && !editing && (
        <section className="mt-4">
          <p className="tracking-code break-all rounded-md bg-muted px-3 py-2.5 text-[12px] leading-relaxed">{l.plb_url}</p>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5">
            <Button variant="outline" size="lg" className="h-[52px] rounded-xl" onClick={() => copyMessage(message)}>
              <Copy /> Copy
            </Button>
            <Button size="lg" className="h-[52px] rounded-xl text-[15px]" onClick={() => sendMessage(message)}><Send /> Send to a chat</Button>
          </div>
          <button type="button" className="mt-2 px-1 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={() => copyLinkOnly(l.plb_url!)}>Copy the link only</button>
        </section>
      )}

      {!editing && <BuyerLinks listing={l} live={s.live} />}

      {s.live && l.plb_url && !editing && (
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
              <p className="whitespace-pre-line px-3 py-2.5 text-[13px] leading-snug">
                {message.slice(0, message.lastIndexOf('\n'))}{'\n'}
                <span className="break-all text-brand underline">{l.plb_url}</span>
              </p>
            </div>
            <p className="mt-2 text-right text-[11px] text-muted-foreground">What Copy and Send to a chat give you</p>
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

      {s.live && !editing && (
        <Button
          variant="outline"
          size="lg"
          className="mt-6 h-12 w-full rounded-xl text-status-refund"
          disabled={close.isPending}
          onClick={() => setAsk('close')}
        >
          {close.isPending && <Loader2 className="animate-spin" />} Close this link
        </Button>
      )}
      {l.status === 'ARCHIVED' && (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">This link is closed, so the product can't be edited. List it again from Sell to make a new link.</p>
      )}

      <ConfirmDialog
        open={ask === 'discard' || blocker.state === 'blocked'}
        title="Throw away your changes?"
        body="You've edited this product but haven't saved. Leaving now keeps it as it was."
        confirm="Discard changes"
        danger
        onConfirm={() => { setAsk(null); stopEdit(); if (blocker.state === 'blocked') blocker.proceed() }}
        onCancel={() => { setAsk(null); if (blocker.state === 'blocked') blocker.reset() }}
      />
      <ConfirmDialog
        open={ask === 'close'}
        title="Close this PayPal link?"
        body="Buyers who open the link won't be able to pay. Paid orders stay as they are. You can't reopen it, but you can list the product again."
        confirm="Close link"
        cancel="Keep it live"
        danger
        onConfirm={() => { setAsk(null); close.mutate() }}
        onCancel={() => setAsk(null)}
      />
      </div>
      </div>
    </main>
  )
}
