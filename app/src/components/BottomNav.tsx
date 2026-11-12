import { House, MessageCircle, Package, Plus, Tag } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Home', icon: House },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/products', label: 'Products', icon: Tag },
  { to: '/ask', label: 'Ask', icon: MessageCircle },
]

// Standard bottom tab bar with Sell raised in the middle, within thumb reach.
export function BottomNav() {
  const link = (i: (typeof items)[number]) => (
    <NavLink
      key={i.to}
      to={i.to}
      end={i.to === '/'}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
          isActive ? 'text-ink' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <i.icon className="size-[22px]" strokeWidth={isActive ? 2.3 : 1.9} />
          {i.label}
        </>
      )}
    </NavLink>
  )
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden pb-[max(env(safe-area-inset-bottom),10px)]">
      {/* Content scrolling under the nav softens into a blur instead of meeting a hard edge. */}
      <div aria-hidden="true" className="nav-scrim pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[calc(100%+56px)]" />
      <div className="nav-glass mx-auto flex max-w-md items-center rounded-4xl px-1.5 shadow-[var(--nav-shadow)]">
        {items.slice(0, 2).map(link)}
        <NavLink
          to="/sell"
          aria-label="List a product"
          className="mx-1 -mt-7 grid size-[58px] shrink-0 place-items-center rounded-3xl bg-brand text-brand-foreground shadow-[0_10px_20px_-8px_var(--brand)] ring-4 ring-paper transition-transform duration-200 ease-out active:scale-95"
        >
          <Plus className="size-7" strokeWidth={2.4} />
        </NavLink>
        {items.slice(2).map(link)}
      </div>
    </nav>
  )
}

/** Wide screens: a fixed left rail with the brand, the same destinations and the Sell action. */
export function SideNav({ initial }: { initial: string }) {
  return (
    <aside aria-label="Main" className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border bg-card/70 px-4 pb-5 pt-6 backdrop-blur-md lg:flex">
      <span className="flex items-center gap-2 px-2">
        <img src="/icon.svg" alt="" className="size-8 rounded-md" />
        <span className="text-[19px] font-bold tracking-[-0.02em] text-ink">ShipSafe</span>
      </span>
      <NavLink
        to="/sell"
        className="mt-7 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-brand-foreground shadow-[0_10px_20px_-10px_var(--brand)] transition-transform duration-150 active:scale-[0.98]"
      >
        <Plus className="size-5" strokeWidth={2.4} /> List a product
      </NavLink>
      <div className="mt-6 flex flex-col gap-1">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors',
                isActive ? 'bg-ink text-paper' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <i.icon className="size-5" strokeWidth={2} /> {i.label}
          </NavLink>
        ))}
      </div>
      <NavLink
        to="/account"
        className={({ isActive }) => cn('mt-auto flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors', isActive ? 'bg-accent' : 'hover:bg-accent')}
      >
        <span className="grid size-9 place-items-center rounded-full bg-ink text-[15px] font-semibold text-paper">{initial}</span>
        <span className="leading-tight">
          <span className="block text-[14px] font-semibold">Your shop</span>
          <span className="block text-[12px] text-muted-foreground">PayPal connected</span>
        </span>
      </NavLink>
    </aside>
  )
}
