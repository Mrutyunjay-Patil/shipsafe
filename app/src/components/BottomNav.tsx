import { House, MessageCircle, Package, Plus, Table2 } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Home', icon: House },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/ask', label: 'Ask', icon: MessageCircle },
  { to: '/board', label: 'Board', icon: Table2 },
]

// Floating pill nav with a raised Sell button in the middle, as in the wallet references.
export function BottomNav() {
  const link = (i: (typeof items)[number]) => (
    <NavLink
      key={i.to}
      to={i.to}
      end={i.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
          isActive ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      <i.icon className="size-5" strokeWidth={2} />
      {i.label}
    </NavLink>
  )
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="glass mx-auto flex max-w-md items-center rounded-full bg-card/90 px-2 dark:bg-card/85">
        {items.slice(0, 2).map(link)}
        <NavLink
          to="/sell"
          aria-label="Sell something"
          className="-mt-8 mx-1 grid size-14 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/40 transition-transform active:scale-95"
        >
          <Plus className="size-7" strokeWidth={2.4} />
        </NavLink>
        {items.slice(2).map(link)}
      </div>
    </nav>
  )
}
