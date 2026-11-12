import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { sentenceCase, Stamp } from '@/components/airmail'
import { StatusBadge } from '@/components/StatusBadge'
import { api, MOCK, money, type Order, type OrderStatus, photoUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

ModuleRegistry.registerModules([AllCommunityModule])

// AG Grid reads the app's colours from theme.css through CSS variables.
const gridTheme = themeQuartz.withParams({
  fontFamily: 'var(--brand-font)',
  fontSize: 14,
  backgroundColor: 'var(--envelope)',
  foregroundColor: 'var(--foreground)',
  headerBackgroundColor: 'var(--envelope)',
  headerTextColor: 'var(--muted-foreground)',
  headerFontWeight: 600,
  borderColor: 'var(--border)',
  accentColor: 'var(--brand)',
  rowHoverColor: 'var(--accent)',
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  rowHeight: 72,
  headerHeight: 44,
  cellHorizontalPadding: 14,
})

const FILTERS: { key: 'ALL' | OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'To post' },
  { key: 'SHIPPED', label: 'In the post' },
  { key: 'PROTECTED', label: 'Protected' },
  { key: 'NEEDS_REFUND', label: 'Refund' },
]

const cell = (node: React.ReactNode) => <span className="flex h-full items-center leading-normal">{node}</span>

function useWide() {
  const q = '(min-width: 768px)'
  const [wide, setWide] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

export default function Orders() {
  const nav = useNavigate()
  const wide = useWide()
  const [params, setParams] = useSearchParams()
  const filter = (params.get('filter') ?? 'ALL') as (typeof FILTERS)[number]['key']
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders, refetchInterval: MOCK ? 4_000 : 20_000 })
  const all = orders.data ?? []
  const rows = all.filter((o) => filter === 'ALL' || o.status === filter)
  const count = (k: (typeof FILTERS)[number]['key']) => (k === 'ALL' ? all.length : all.filter((o) => o.status === k).length)

  const cols = useMemo<ColDef<Order>[]>(() => [
    {
      headerName: 'Ship to', colId: 'dest', sortable: true, ...(wide ? { minWidth: 230, flex: 1.2 } : { width: 168, pinned: 'left' as const }),
      valueGetter: (p) => p.data?.ship_city ?? '',
      cellRenderer: (p: ICellRendererParams<Order>) => p.data && cell(
        <span className="flex min-w-0 items-center gap-3">
          <Stamp src={photoUrl(p.data.photo_key)} className={cn('shrink-0', wide ? 'size-11' : 'size-10')} />
          <span className="min-w-0 leading-tight">
            <span className="label-caps block truncate text-[18px] text-ink">{p.data.ship_city}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {[p.data.ship_postcode, p.data.ship_country].filter(Boolean).join(' ')}
            </span>
          </span>
        </span>,
      ),
    },
    {
      field: 'status', headerName: 'Status', width: wide ? 180 : 134,
      cellRenderer: (p: ICellRendererParams<Order>) => p.data && cell(<StatusBadge status={p.data.status} short />),
    },
    {
      headerName: 'Item', ...(wide ? { flex: 1.5, minWidth: 220 } : { width: 220 }), valueGetter: (p) => p.data?.title ?? '',
      cellRenderer: (p: ICellRendererParams<Order>) => p.data && cell(
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-medium">{p.data.title}</span>
          {p.data.variant && <span className="block text-[12px] text-muted-foreground">{p.data.variant}</span>}
        </span>,
      ),
    },
    { field: 'amount', headerName: 'Amount', width: wide ? 120 : 100, type: 'rightAligned', valueFormatter: (p) => (p.data ? money(p.value, p.data.currency) : ''), cellClass: 'money font-semibold' },
    {
      field: 'tracking_number', headerName: 'Tracking', width: 190,
      cellRenderer: (p: ICellRendererParams<Order>) =>
        cell(p.value ? <span className="tracking-code text-[13px]">{p.value}</span> : <span className="text-[13px] text-muted-foreground">Not posted yet</span>),
    },
    { field: 'seller_protection', headerName: 'Seller protection', width: 170, valueFormatter: (p) => sentenceCase(p.value) || 'Not reported' },
    {
      field: 'paid_at', headerName: 'Paid', width: 100, sort: 'desc',
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''),
      cellClass: 'money',
    },
  ], [wide])

  return (
    <main className={cn('mx-auto px-5 pt-[max(env(safe-area-inset-top),20px)]', wide ? 'max-w-7xl pb-10' : 'max-w-md')}>
      <header className="pb-4 pt-3">
        <h1 className="text-[26px] font-semibold leading-tight">Orders</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">New PayPal payments land here on their own. Tap a row to open it{wide ? '' : ', swipe the table for more columns'}.</p>
      </header>

      <div role="tablist" aria-label="Filter orders" className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-28px),transparent)]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setParams(f.key === 'ALL' ? {} : { filter: f.key })}
            role="tab"
            aria-selected={filter === f.key}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-200',
              filter === f.key ? 'border-ink bg-ink text-paper' : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
            <span className="money text-[12px] opacity-70">{count(f.key)}</span>
          </button>
        ))}
      </div>

      <section className="envelope">
        <AgGridReact<Order>
          theme={gridTheme}
          rowData={rows}
          columnDefs={cols}
          loading={orders.isLoading}
          domLayout="autoHeight"
          getRowId={(p) => p.data.id}
          suppressMovableColumns
          onRowClicked={(e) => e.data && nav(`/orders/${e.data.id}`)}
          overlayNoRowsTemplate={filter === 'ALL' ? 'No orders yet. Share a PayPal link in a chat and paid orders land here.' : 'Nothing in this pile right now.'}
        />
      </section>
    </main>
  )
}
