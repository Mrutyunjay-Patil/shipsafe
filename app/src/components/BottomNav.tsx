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
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
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
