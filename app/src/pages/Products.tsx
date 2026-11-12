import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { StatStrip } from '@/components/dashboard'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router'
import { Stamp } from '@/components/airmail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Listing, money, photoUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

export const listingState = (l: Pick<Listing, 'status' | 'quantity' | 'sold'>) => {
  const left = Math.max(0, l.quantity - l.sold)
  if (l.status === 'ARCHIVED') return { label: 'Closed', live: false, left }
  if (l.status === 'SOLD_OUT' || left === 0) return { label: 'Sold out', live: false, left }
  return { label: 'Link live', live: true, left }
}

function ProductCard({ l }: { l: Listing }) {
  const s = listingState(l)
  return (
    <Link to={`/products/${l.id}`} className="group flex flex-col transition-transform duration-150 active:scale-[0.98]">
      <Stamp src={photoUrl(l.photo_key)} alt={l.title} className={cn('aspect-[4/5] w-full', !s.live && 'opacity-75 grayscale-[0.35]')} />
      <span className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-snug">{l.title}</span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="money text-[15px] font-semibold text-ink">{money(l.price, l.currency)}</span>
        <span className={cn('text-[12px] font-medium', s.live ? 'text-muted-foreground' : 'text-status-refund')}>
          {s.live ? `${s.left} of ${l.quantity} left` : 'Sold out'}
        </span>
      </span>
    </Link>
  )
}

export default function Products() {
  const listings = useQuery({ queryKey: ['listings'], queryFn: api.listings })
  const [q, setQ] = useState('')
  const all = listings.data ?? []
  const list = all.filter((l) => !q.trim() || `${l.title} ${l.colours.join(' ')} ${l.category ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
  const states = all.map((l) => listingState(l))
  const liveN = states.filter((s) => s.live).length
  const stock = states.reduce((a, s) => a + s.left, 0)
  const value = all.reduce((a, l) => a + l.sold * Number(l.price), 0)
  return (
    <main className="mx-auto max-w-md px-5 sm:max-w-3xl lg:max-w-6xl lg:px-10 lg:pt-8 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="flex items-center justify-between gap-3 pb-5 pt-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Products</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Everything you've listed, with its PayPal link.</p>
        </div>
        <Button asChild className="hidden h-10 rounded-lg sm:inline-flex"><Link to="/sell"><Plus /> List a product</Link></Button>
      </header>
      {all.length > 0 && (
        <>
          <StatStrip items={[
            { label: 'Live links', value: String(liveN), note: `${all.length - liveN} sold out` },
            { label: 'Products', value: String(all.length), note: 'Listed in total' },
            { label: 'Units in stock', value: String(stock), note: 'Across live links' },
            { label: 'Sold', value: money(value), note: `${all.reduce((a, l) => a + l.sold, 0)} units` },
          ]} />
          <div className="relative mb-5 mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="h-11 rounded-lg bg-card pl-10 text-[15px]" />
          </div>
        </>
      )}
      {listings.isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[4/5] rounded-xs" />)}
        </div>
      ) : all.length === 0 ? (
        <div className="sheet rounded-2xl px-5 py-8 text-center">
          <p className="text-[17px] font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Photograph something you sell and ShipSafe writes the listing.</p>
          <Button asChild size="lg" className="mt-5 h-12 rounded-xl">
            <Link to="/sell"><Plus /> List a product</Link>
          </Button>
        </div>
      ) : (
        <>
          {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No products match "{q}".</p>}
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-10">
            {list.map((l) => <ProductCard key={l.id} l={l} />)}
          </div>
        </>
      )}
    </main>
  )
}
