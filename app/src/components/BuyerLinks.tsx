import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Link2, Loader2, Plus, Send, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api, type BuyerLink, type ListingDetail, money } from '@/lib/api'
import { buyerMessage, copyLinkOnly, copyMessage, firstName, sendMessage } from '@/lib/share'
import { cn } from '@/lib/utils'

const EXPIRY = [3, 7, 14, 30]
const priceOk = (p: string) => /^\d{1,5}(\.\d{1,2})?$/.test(p) && Number(p) > 0 && Number(p) <= 10000

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  return d <= 0 ? 'expires today' : d === 1 ? 'expires tomorrow' : `expires in ${d} days`
}

/** One-buyer PayPal links made from this listing: each takes one payment, then closes. */
export function BuyerLinks({ listing: l, live }: { listing: ListingDetail; live: boolean }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const [closing, setClosing] = useState<BuyerLink | null>(null)
  const links = l.buyer_links ?? []
  const openCount = links.filter((b) => b.status === 'OPEN').length

  const close = useMutation({
    mutationFn: (id: string) => api.closeBuyerLink(id),
    onSuccess: () => { toast.success('Buyer link closed. It can no longer be paid.'); qc.invalidateQueries({ queryKey: ['listing', l.id] }) },
    onError: (e) => toast.error(`Couldn't close it. ${(e as Error).message}`),
  })

  if (!live && links.length === 0) return null
  const shown = all ? links : links.slice(0, 4)

  return (
    <section className="mt-7">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">Links for one buyer</h2>
          <p className="text-[13px] text-muted-foreground">Each takes one payment, then closes. Stock is shared with the main link.</p>
        </div>
        {live && (
          <Button size="sm" className="h-9 shrink-0 rounded-full" onClick={() => setOpen(true)}>
            <Plus /> New
          </Button>
        )}
      </div>

      <div className="sheet divide-y divide-border/70 overflow-hidden rounded-2xl">
        {links.length === 0 && (
          <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-accent/40">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-ink"><Link2 className="size-5" /></span>
            <span className="text-[14px] text-muted-foreground">
              Make a link for one person, with a special price or a set colour if you like. You'll see who paid.
            </span>
          </button>
        )}
        {shown.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{b.label}</span>
              <span className="block truncate text-[13px] text-muted-foreground">
                <span className="money">{money(b.price, l.currency)}</span>
                {b.price !== l.price && ' special price'}
                {b.colour && ` · ${b.colour}`}
                {' · '}
                <span className={cn(b.status === 'PAID' && 'font-medium text-success', b.status === 'OPEN' && 'text-foreground')}>
                  {b.status === 'OPEN' ? daysLeft(b.expires_at)
                    : b.status === 'PAID' ? `Paid${b.order_city ? `, ${b.order_city}` : ''}`
                      : b.status === 'EXPIRED' ? 'Expired' : 'Closed'}
                </span>
              </span>
            </span>
            {b.status === 'OPEN' && b.plb_url && (
              <span className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label={`Copy the message and link for ${b.label}`} onClick={() => copyMessage(buyerMessage(l, b, b.plb_url!))}><Copy /></Button>
                <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label={`Send the link for ${b.label}`} onClick={() => sendMessage(buyerMessage(l, b, b.plb_url!))}><Send /></Button>
                <Button variant="ghost" size="icon" className="size-9 rounded-full text-muted-foreground" aria-label={`Close the link for ${b.label}`} disabled={close.isPending} onClick={() => setClosing(b)}><X /></Button>
              </span>
            )}
            {b.status === 'PAID' && <Check className="size-5 shrink-0 text-success" aria-hidden />}
          </div>
        ))}
        {links.length > 4 && (
          <button type="button" onClick={() => setAll(!all)} className="w-full px-4 py-3 text-center text-[14px] font-medium text-brand hover:bg-accent/40">
            {all ? 'Show fewer' : `Show all ${links.length}`}
          </button>
        )}
      </div>
      {openCount > 0 && !live && (
        <p className="mt-2 px-1 text-[12px] text-muted-foreground">The product isn't on sale, so open buyer links are closing.</p>
      )}

      {open && <NewBuyerLink listing={l} onClose={() => setOpen(false)} />}
      <ConfirmDialog
        open={!!closing}
        title={`Close the link for ${closing?.label}?`}
        body="They won't be able to pay with it. You can make them a new one."
        confirm="Close link"
        cancel="Keep it"
        danger
        onConfirm={() => { if (closing) close.mutate(closing.id); setClosing(null) }}
        onCancel={() => setClosing(null)}
      />
    </section>
  )
}

function NewBuyerLink({ listing: l, onClose }: { listing: ListingDetail; onClose: () => void }) {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [price, setPrice] = useState(l.price)
  const [colour, setColour] = useState<string | null>(null)
  const [days, setDays] = useState(7)
  const [made, setMade] = useState<{ url: string; price: string; colour: string | null; label: string } | null>(null)
  const diff = priceOk(price) ? Number(price) - Number(l.price) : 0

  const create = useMutation({
    mutationFn: () => api.createBuyerLink(l.id, {
      label: label.trim(), price: Number(price) === Number(l.price) ? undefined : price, colour: colour ?? undefined, expires_days: days,
    }),
    onSuccess: (r) => {
      setMade({ url: r.url, price: r.price, colour: r.colour, label: label.trim() })
      qc.invalidateQueries({ queryKey: ['listing', l.id] })
    },
    onError: (e) => toast.error(`Couldn't make the link. ${(e as Error).message}`),
  })
  const labelErr = label.trim().length === 0 ? null : label.trim().length > 60 ? 'Keep it under 60 characters.' : null
  const priceErr = priceOk(price) ? null : 'Use a price more than 0 and at most 10,000, like 24 or 24.50.'
  const ready = label.trim().length > 0 && !labelErr && !priceErr

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !create.isPending) onClose() }}>
      <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto rounded-2xl">
        {made ? (
          <>
            <DialogHeader>
              <DialogTitle>Link for {made.label} is ready</DialogTitle>
              <DialogDescription>
                {money(made.price, l.currency)}{made.colour ? ` in ${made.colour}` : ''}. It works for one payment and closes on its own after {days} days.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl bg-muted/70 px-3.5 py-3">
              <p className="text-[12px] font-medium text-muted-foreground">Copy and Send give {firstName(made.label) || 'them'} this message</p>
              <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-snug">{buyerMessage(l, made, made.url)}</p>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-2.5">
              <Button variant="outline" size="lg" className="h-12 rounded-xl" onClick={() => copyMessage(buyerMessage(l, made, made.url))}><Copy /> Copy</Button>
              <Button size="lg" className="h-12 rounded-xl" onClick={() => sendMessage(buyerMessage(l, made, made.url))}><Send /> Send to {firstName(made.label) || 'them'}</Button>
            </div>
            <button type="button" className="text-[13px] font-medium text-muted-foreground hover:text-foreground hover:underline" onClick={() => copyLinkOnly(made.url)}>Copy the link only</button>
            <Button variant="ghost" className="h-10 rounded-xl" onClick={onClose}>Done</Button>
          </>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (ready) create.mutate() }}>
            <DialogHeader>
              <DialogTitle>New buyer link</DialogTitle>
              <DialogDescription>A PayPal link for one person. When they pay, you'll see their name on the order.</DialogDescription>
            </DialogHeader>
            <fieldset disabled={create.isPending} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="bl-label" className="text-sm font-medium">Who is it for?</label>
                <Input id="bl-label" autoFocus value={label} maxLength={60} placeholder="Priya, WhatsApp" onChange={(e) => setLabel(e.target.value)} className="h-12 rounded-lg bg-card text-[16px]" />
                <p className={cn('text-[12px]', labelErr ? 'text-destructive' : 'text-muted-foreground')}>{labelErr ?? 'Only you see this. A name and where you chat works well.'}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="bl-price" className="text-sm font-medium">Price in {l.currency}</label>
                <Input id="bl-price" inputMode="decimal" value={price}
                  onChange={(e) => setPrice(e.target.value.replace(',', '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                  onBlur={() => { if (priceOk(price)) setPrice(Number(price).toFixed(2)) }}
                  className="money h-12 rounded-lg bg-card text-[20px] font-semibold" aria-invalid={!!priceErr} />
                <p className={cn('text-[12px]', priceErr ? 'text-destructive' : 'text-muted-foreground')}>
                  {priceErr ?? (diff < 0 ? `${money(-diff, l.currency)} off the usual ${money(l.price, l.currency)}.`
                    : diff > 0 ? `${money(diff, l.currency)} more than the usual ${money(l.price, l.currency)}.`
                      : 'The usual price. Change it for a special price.')}
                </p>
              </div>
              {l.colours.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Colour</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
                    {[null, ...l.colours].map((c) => (
                      <button key={c ?? '_any'} type="button" role="radio" aria-checked={colour === c} onClick={() => setColour(c)}
                        className={cn('h-9 rounded-full border px-3.5 text-sm font-medium transition-colors',
                          colour === c ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-card hover:bg-muted')}>
                        {c ?? 'Buyer picks'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-muted-foreground">{colour ? `The link sells ${colour} only, so the buyer has nothing to pick.` : 'The buyer chooses on PayPal, as with the main link.'}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">Closes if unpaid after</p>
                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Expiry">
                  {EXPIRY.map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)}
                      className={cn('h-10 rounded-lg border text-sm font-medium transition-colors',
                        days === d ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-card hover:bg-muted')}>
                      {d} days
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
            <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={!ready || create.isPending}>
              {create.isPending ? <><Loader2 className="animate-spin" /> Making the link</> : 'Make the link'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
