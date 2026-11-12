import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Copy, ImagePlus, Loader2, Minus, Plus, Share2, Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError, money } from '@/lib/api'

type Form = { title: string; description: string; colours: string[]; category: string; price: string; quantity: number }

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
    onError: (e) => toast.error(`Couldn't read the photo: ${(e as Error).message}`),
  })

  const create = useMutation({
    mutationFn: () => api.createListing({ ...form!, photo_key: photoKey, ai_confidence: confidence }),
    onSuccess: (r) => {
      setLink({ url: r.url, plb_id: r.plb_id })
      qc.invalidateQueries({ queryKey: ['listings'] })
    },
    onError: (e) => toast.error(e instanceof ApiError && e.body?.error === 'paypal' ? `PayPal said: ${e.message}` : (e as Error).message),
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
    if (form && c && !form.colours.includes(c)) set('colours', [...form.colours, c].slice(0, 10))
    setColour('')
  }

  const share = async () => {
    if (!link) return
    const text = `${form?.title} for ${money(form?.price ?? 0)}. Pay securely with PayPal:`
    if (navigator.share) await navigator.share({ title: form?.title, text, url: link.url }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link.url}`)}`, '_blank')
  }

  if (link && form) {
    return (
      <main className="mx-auto max-w-md px-5 pt-14 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Your PayPal link is ready</h1>
        <p className="mt-1 text-muted-foreground">Paste it into the chat with your buyer.</p>
        <div className="glass mt-6 rounded-2xl p-4 text-left">
          <p className="font-medium">{form.title}</p>
          <p className="money text-sm text-muted-foreground">{money(form.price)} · {form.colours.join(', ') || 'one style'}</p>
          <p className="mt-3 break-all rounded-xl bg-muted px-3 py-2 font-mono text-xs">{link.url}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" className="h-12 rounded-full" onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Link copied') }}>
            <Copy /> Copy
          </Button>
          <Button size="lg" className="h-12 rounded-full" onClick={share}>
            <Share2 /> Share
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          The link closes by itself after {form.quantity === 1 ? 'the first sale' : `${form.quantity} sales`}.
        </p>
        <div className="mt-8 flex justify-center gap-6 text-sm font-medium">
          <button className="text-brand" onClick={() => { setLink(null); setForm(null); setPreview(null) }}>List another</button>
          <Link to="/" className="text-muted-foreground">Done</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="py-3">
        <h1 className="text-xl font-semibold tracking-tight">New listing</h1>
        <p className="text-sm text-muted-foreground">Snap the product. AI fills in the rest, you check it.</p>
      </header>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="glass relative mt-2 flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] text-muted-foreground"
      >
        {preview ? (
          <img src={preview} alt="Product" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <span className="grid size-16 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/30">
              <Camera className="size-7" />
            </span>
            <span className="mt-3 font-medium text-foreground">Take a photo</span>
            <span className="text-sm">or pick one from your gallery</span>
          </>
        )}
        {draft.isPending && (
          <span className="absolute inset-0 grid place-items-center bg-background/55 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-foreground">
              <Sparkles className="size-4 animate-pulse text-brand" /> Drafting your listing
            </span>
          </span>
        )}
        {preview && !draft.isPending && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground">
            <ImagePlus className="size-3.5" /> Retake
          </span>
        )}
      </button>

      {form && (
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => { e.preventDefault(); create.mutate() }}
        >
          {confidence !== undefined && confidence < 0.6 && (
            <p className="rounded-xl bg-warning/15 px-3 py-2 text-sm">The AI wasn't sure about this photo. Check every field.</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} maxLength={127} onChange={(e) => set('title', e.target.value)} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description <span className="text-muted-foreground">{form.description.length}/140</span></Label>
            <Textarea id="desc" value={form.description} maxLength={140} rows={3} onChange={(e) => set('description', e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Colours the buyer can pick</Label>
            <div className="flex flex-wrap gap-2">
              {form.colours.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-sm font-medium text-brand">
                  {c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => set('colours', form.colours.filter((x) => x !== c))} className="rounded-full p-0.5 hover:bg-brand/10">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <Input
                value={colour}
                placeholder="Add colour"
                onChange={(e) => setColour(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColour() } }}
                onBlur={addColour}
                className="h-8 w-32 rounded-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price, USD</Label>
              <Input id="price" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} className="money h-12 rounded-xl text-lg font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label>In stock</Label>
              <div className="flex h-12 items-center justify-between rounded-xl border px-2">
                <Button type="button" variant="ghost" size="icon" onClick={() => set('quantity', Math.max(1, form.quantity - 1))}><Minus /></Button>
                <span className="money text-lg font-semibold">{form.quantity}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => set('quantity', Math.min(100, form.quantity + 1))}><Plus /></Button>
              </div>
            </div>
          </div>
          <Button type="submit" size="lg" className="h-14 w-full rounded-full text-base" disabled={create.isPending || !/^\d+(\.\d{1,2})?$/.test(form.price)}>
            {create.isPending ? <><Loader2 className="animate-spin" /> Creating PayPal link</> : 'Create PayPal link'}
          </Button>
        </form>
      )}
    </main>
  )
}
