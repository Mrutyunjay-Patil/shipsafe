import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Copy, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Envelope } from '@/components/airmail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, MOCK, money } from '@/lib/api'
import { cn } from '@/lib/utils'

const since = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <dt className="text-[15px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[15px] font-medium">{children}</dd>
    </div>
  )
}

export default function Account() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { theme, setTheme } = useTheme()
  const acc = useQuery({ queryKey: ['account'], queryFn: api.account })
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => { qc.clear(); location.href = '/' },
  })
  const a = acc.data
  const name = a?.seller.display_name ?? 'Your shop'

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center gap-1 py-2">
        <Button variant="ghost" size="icon" className="-ml-2 size-11 rounded-full" onClick={() => nav(-1)} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-[17px] font-semibold">Your shop</h1>
      </header>

      {acc.isLoading || !a ? (
        <Skeleton className="mt-2 h-[220px] rounded-2xl" />
      ) : (
        <Envelope className="mt-2">
          <div className="px-5 pb-5 pt-5">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-[16px] bg-ink text-[24px] font-semibold text-paper">
                {name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[22px] font-semibold leading-tight">{name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Seller since {new Date(a.seller.connected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-dashed border-border pt-4 text-center">
              <div>
                <dt className="text-[12px] text-muted-foreground">Paid</dt>
                <dd className="money mt-0.5 text-[17px] font-semibold">{money(a.counts.paid_total)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted-foreground">Orders</dt>
                <dd className="money mt-0.5 text-[17px] font-semibold">{a.counts.orders}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted-foreground">Protected</dt>
                <dd className="money mt-0.5 text-[17px] font-semibold">{a.counts.protected}</dd>
              </div>
            </dl>
          </div>
        </Envelope>
      )}

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[15px] font-semibold">PayPal</h2>
        <dl className="sheet divide-y divide-border/70 rounded-2xl">
          <Row label="Signed in with">Log in with PayPal</Row>
          <Row label="Account status">
            {a?.seller.paypal_verified ? (
              <span className="inline-flex items-center gap-1 text-success"><Check className="size-4" /> Verified by PayPal</span>
            ) : (
              'Connected'
            )}
          </Row>
          <Row label="Environment">
            <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', a?.environment === 'live' ? 'bg-success/15 text-success' : 'bg-[color-mix(in_oklch,var(--status-paid)_16%,transparent)] text-[color-mix(in_oklch,var(--status-paid)_80%,var(--foreground))]')}>
              {a?.environment === 'live' ? 'Live' : 'Sandbox test money'}
            </span>
          </Row>
          <Row label="Active payment links">{a ? <span className="money">{a.counts.active_listings}</span> : '…'}</Row>
          <Row label="Last payment notice">
            {a?.last_webhook ? since(a.last_webhook.received_at) : 'None yet'}
          </Row>
        </dl>
        <p className="mt-2 px-1 text-[13px] text-muted-foreground">
          PayPal tells ShipSafe about every payment through a signed notice, so new orders appear without you refreshing.
          {a && !MOCK && (
            <button
              className="ml-1 inline-flex items-center gap-1 font-medium text-brand"
              onClick={() => { navigator.clipboard.writeText(a.webhook_url); toast.success('Notice address copied') }}
            >
              <Copy className="size-3.5" /> Copy notice address
            </button>
          )}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[15px] font-semibold">Appearance</h2>
        <div role="radiogroup" aria-label="Appearance" className="sheet grid grid-cols-3 gap-1 rounded-2xl p-1">
          {[
            { v: 'light', label: 'Light', icon: Sun },
            { v: 'dark', label: 'Dark', icon: Moon },
            { v: 'system', label: 'Match phone', icon: Monitor },
          ].map((o) => (
            <button
              key={o.v}
              role="radio"
              aria-checked={theme === o.v}
              onClick={() => setTheme(o.v)}
              className={cn(
                'flex h-12 items-center justify-center gap-1.5 rounded-[12px] text-sm font-medium transition-colors duration-200',
                theme === o.v ? 'bg-ink text-paper' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <o.icon className="size-4" /> {o.label}
            </button>
          ))}
        </div>
      </section>

      <Button
        variant="outline"
        size="lg"
        className="mt-8 h-[52px] w-full rounded-[14px] text-[15px]"
        disabled={logout.isPending || MOCK}
        onClick={() => logout.mutate()}
      >
        <LogOut /> Sign out
      </Button>
      {MOCK && <p className="mt-2 text-center text-[13px] text-muted-foreground">Sign out is off in the sample preview.</p>}
    </main>
  )
}
