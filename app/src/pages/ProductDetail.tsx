import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Send } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Stamp } from '@/components/airmail'
import { OrderRow } from '@/components/OrderRow'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, MOCK, money, photoUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { listingState } from './Products'

export default function ProductDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['listing', id], queryFn: () => api.listing(id) })
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
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center gap-1 py-2">
        <Button variant="ghost" size="icon" className="-ml-2 size-11 rounded-full" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">Product</h1>
      </header>

      <Stamp src={photoUrl(l.photo_key)} alt={l.title} className="mx-auto mt-2 aspect-[4/5] w-[72%] -rotate-1" />

      <section className="mt-6">
        <h2 className="text-[24px] font-semibold leading-tight">{l.title}</h2>
        <p className="money mt-2 text-[28px] font-semibold leading-none text-ink">{money(l.price, l.currency)}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{l.description}</p>
      </section>

      <dl className="sheet mt-5 divide-y divide-border/70 rounded-2xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="text-[15px] text-muted-foreground">Stock</dt>
          <dd className="money text-[15px] font-medium">{s.left} of {l.quantity} left</dd>
        </div>
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
    </main>
  )
}
