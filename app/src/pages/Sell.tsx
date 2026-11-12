import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Copy, Loader2, Minus, Plus, Send, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Envelope, Stamp } from '@/components/airmail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError, money } from '@/lib/api'
import { cn } from '@/lib/utils'

type Form = { title: string; description: string; colours: string[]; category: string; price: string; quantity: number }

const field = 'h-12 rounded-[12px] bg-card text-[16px]'

export default function Sell() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [photoKey, setPhotoKey] = useState<string>()
  const [confidence, setConfidence] = useState<number>()
  const [form, setForm] = useState<Form | null>(null)
  const [colour, setColour] = useState('')
  const [link, setLink] = useState<{ url: string; plb_id: string } | null>(null)

  const draft = useMutation({
    mutationFn: api.draftListing,
    onSuccess: (r) => {
      setPhotoKey(r.photo_key)
      setConfidence(r.draft.confidence)
      setForm({
        title: r.draft.title, description: r.draft.description.slice(0, 140), colours: r.draft.colours.slice(0, 10),
        category: r.draft.category, price: r.draft.suggested_price_usd.toFixed(2), quantity: 1,
      })
    },
    onError: (e) => toast.error(`Couldn't read that photo. ${(e as Error).message}. Try again in better light.`),
  })

  const create = useMutation({
    mutationFn: () => api.createListing({ ...form!, photo_key: photoKey, ai_confidence: confidence }),
    onSuccess: (r) => { setLink({ url: r.url, plb_id: r.plb_id }); qc.invalidateQueries({ queryKey: ['listings'] }) },
    onError: (e) => toast.error(e instanceof ApiError && e.body?.error === 'paypal' ? `PayPal refused the link: ${e.message}` : (e as Error).message),
  })

  const pick = (f?: File) => {
    if (!f) return
    setPreview(URL.createObjectURL(f))
    setForm(null)
    setLink(null)
    draft.mutate(f)
  }
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const addColour = () => {
    const c = colour.trim()
    if (form && c && !form.colours.some((x) => x.toLowerCase() === c.toLowerCase())) set('colours', [...form.colours, c].slice(0, 10))
    setColour('')
  }
  const shareText = () => `${form?.title}, ${money(form?.price ?? 0)}. Pay safely with PayPal here:`
  const share = async () => {
    if (!link) return
    if (navigator.share) await navigator.share({ title: form?.title, text: shareText(), url: link.url }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText()} ${link.url}`)}`, '_blank', 'noopener')
  }
  const reset = () => { setLink(null); setForm(null); setPreview(null) }

  if (link && form) {
    return (
      <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),20px)]">
        <h1 className="pt-3 text-[26px] font-semibold leading-tight">Your link is ready to send</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Paste it into the chat. The buyer pays on PayPal and gives you their address there.</p>

        <Envelope className="envelope-in mt-5">
          <div className="relative px-5 pb-5 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[19px] font-semibold leading-snug">{form.title}</p>
                <p className="money mt-2 text-[28px] font-semibold leading-none">{money(form.price)}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{form.colours.length ? form.colours.join(' · ') : 'One style'}</p>
              </div>
              <Stamp src={preview} className="h-[96px] w-[80px] rotate-[3deg]" />
            </div>
            <p className="tracking-code mt-5 select-all break-all rounded-[10px] bg-muted px-3 py-2.5 text-[12px] leading-relaxed">{link.url}</p>
          </div>
        </Envelope>

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2.5">
          <Button variant="outline" size="lg" className="h-[52px] rounded-[14px]" onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Link copied') }}>
            <Copy /> Copy
          </Button>
          <Button size="lg" className="h-[52px] rounded-[14px] text-[15px]" onClick={share}>
            <Send /> Send to a chat
          </Button>
        </div>
        <p className="mt-3 px-1 text-[13px] text-muted-foreground">
          The link closes on its own after {form.quantity === 1 ? 'the first sale' : `${form.quantity} sales`}. If two buyers pay at once, ShipSafe flags the extra one for a refund.
        </p>
        <div className="mt-6 flex items-center justify-between px-1 text-[15px] font-medium">
          <button className="text-brand" onClick={reset}>List another</button>
          <Link to="/" className="text-muted-foreground">Back to home</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),20px)]">
      <h1 className="pt-3 text-[26px] font-semibold leading-tight">List a product</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">Take one clear photo. ShipSafe writes the listing, you check it.</p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={preview ? 'Retake the product photo' : 'Take a product photo'}
        className={cn('relative mx-auto mt-5 block w-full max-w-[320px] transition-transform active:scale-[0.99]', preview ? 'aspect-[4/5]' : 'aspect-[4/5]')}
      >
        {preview ? (
          <Stamp src={preview} alt="Your product" className="size-full -rotate-1" />
        ) : (
          <span className="stamp flex size-full -rotate-1 flex-col items-center justify-center">
            <span className="flex size-full flex-col items-center justify-center gap-3 border border-dashed border-ink/25 bg-envelope text-center">
              <span className="grid size-16 place-items-center rounded-[18px] bg-brand text-brand-foreground shadow-[0_10px_20px_-8px_var(--brand)]">
                <Camera className="size-7" />
              </span>
              <span className="text-[17px] font-semibold text-foreground">Take a photo</span>
              <span className="max-w-[22ch] text-sm text-muted-foreground">Plain background, good light, the whole product in frame</span>
            </span>
          </span>
        )}
        {draft.isPending && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-medium shadow-lg">
              <Loader2 className="size-4 animate-spin text-brand" /> Writing your listing
            </span>
          </span>
        )}
        {preview && !draft.isPending && (
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium shadow-md">Tap to retake</span>
        )}
      </button>

      {form && (
        <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          {confidence !== undefined && confidence < 0.6 && (
            <p className="rounded-[12px] border border-[color-mix(in_oklch,var(--status-paid)_35%,transparent)] bg-[color-mix(in_oklch,var(--status-paid)_10%,var(--card))] px-3.5 py-2.5 text-sm">
              The photo was hard to read. Check every field before you share it.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} maxLength={127} onChange={(e) => set('title', e.target.value)} className={field} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="desc">Description</Label>
              <span className="money text-xs text-muted-foreground">{form.description.length} of 140</span>
            </div>
            <Textarea id="desc" value={form.description} maxLength={140} rows={3} onChange={(e) => set('description', e.target.value)} className="rounded-[12px] bg-card text-[16px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="colour">Colours the buyer picks from</Label>
            <div className="flex flex-wrap items-center gap-2">
              {form.colours.map((c) => (
                <span key={c} className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card pl-3.5 pr-1.5 text-sm font-medium">
                  {c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => set('colours', form.colours.filter((x) => x !== c))} className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <Input
                id="colour"
                value={colour}
                placeholder="Add a colour"
                onChange={(e) => setColour(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColour() } }}
                onBlur={addColour}
                className="h-9 w-36 rounded-full bg-card"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price in USD</Label>
              <Input id="price" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} className={cn(field, 'money text-[20px] font-semibold')} />
            </div>
            <div className="space-y-1.5">
              <Label>Units to sell</Label>
              <div className="flex h-12 items-center justify-between rounded-[12px] border border-input bg-card px-1">
                <Button type="button" variant="ghost" size="icon" aria-label="One fewer" onClick={() => set('quantity', Math.max(1, form.quantity - 1))}><Minus /></Button>
                <span className="money text-[20px] font-semibold">{form.quantity}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="One more" onClick={() => set('quantity', Math.min(100, form.quantity + 1))}><Plus /></Button>
              </div>
            </div>
          </div>
          <Button type="submit" size="lg" className="h-[52px] w-full rounded-[14px] text-[15px]" disabled={create.isPending || !/^\d+(\.\d{1,2})?$/.test(form.price) || form.title.trim().length < 3}>
            {create.isPending ? <><Loader2 className="animate-spin" /> Making your PayPal link</> : 'Make the PayPal link'}
          </Button>
        </form>
      )}
    </main>
  )
}
