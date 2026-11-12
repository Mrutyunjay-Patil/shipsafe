import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ShippedSafe, sentenceCase, Stamp } from '@/components/airmail'
import { StatusBadge } from '@/components/StatusBadge'
import { api, MOCK, money, type Order, photoUrl } from '@/lib/api'

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
  borderRadius: 10,
  wrapperBorderRadius: 0,
  rowHeight: 64,
  headerHeight: 44,
})

const cell = (node: React.ReactNode) => <span className="flex h-full items-center leading-normal">{node}</span>

export default function Board() {
  const nav = useNavigate()
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders, refetchInterval: MOCK ? 4_000 : 20_000 })
  const rows = orders.data ?? []
  const cols = useMemo<ColDef<Order>[]>(() => [
    {
      headerName: 'Ship to', colId: 'dest', minWidth: 230, flex: 1.1, sortable: true,
      valueGetter: (p) => p.data?.ship_city ?? '',
      cellRenderer: (p: ICellRendererParams<Order>) => p.data && cell(
        <span className="flex items-center gap-3">
          <Stamp src={photoUrl(p.data.photo_key)} className="size-10" />
          <span className="leading-tight">
            <span className="label-caps block text-[18px] text-ink">{p.data.ship_city}</span>
            <span className="block text-[12px] text-muted-foreground">{[p.data.ship_postcode, p.data.ship_country].filter(Boolean).join(' ')}</span>
          </span>
        </span>,
      ),
    },
    {
      field: 'status', headerName: 'Status', width: 190, filter: true,
      cellRenderer: (p: ICellRendererParams<Order>) => p.data && cell(p.data.status === 'PROTECTED' ? <ShippedSafe small /> : <StatusBadge status={p.data.status} />),
    },
    {
      headerName: 'Item', flex: 1.6, minWidth: 240, valueGetter: (p) => p.data?.title ?? '',
      cellRenderer: (p: ICellRendererParams<Order>) => p.data && cell(
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-medium">{p.data.title}</span>
          {p.data.variant && <span className="block text-[12px] text-muted-foreground">{p.data.variant}</span>}
        </span>,
      ),
    },
    { field: 'amount', headerName: 'Amount', width: 120, type: 'rightAligned', valueFormatter: (p) => (p.data ? money(p.value, p.data.currency) : ''), cellClass: 'money font-semibold' },
    {
      field: 'tracking_number', headerName: 'Tracking', width: 190,
      cellRenderer: (p: ICellRendererParams<Order>) =>
        cell(p.value ? <span className="tracking-code text-[13px]">{p.value}</span> : <span className="text-[13px] text-muted-foreground">Not posted yet</span>),
    },
    { field: 'seller_protection', headerName: 'Seller protection', width: 170, valueFormatter: (p) => sentenceCase(p.value) || 'Not reported' },
    {
      field: 'paid_at', headerName: 'Paid', width: 150, sort: 'desc',
      cellRenderer: (p: ICellRendererParams<Order>) => p.data && cell(
        <span className="money text-[13px] font-medium">{new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>,
      ),
    },
  ], [])

  return (
    <main className="mx-auto max-w-7xl px-5 pb-10 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4 pt-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Order board</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Every PayPal order with its tracking and protection. Click a row to open it.</p>
        </div>
        <p className="money text-[13px] text-muted-foreground">{rows.length} order{rows.length === 1 ? '' : 's'}</p>
      </header>
      <section className="envelope">
        <div className="w-full">
          <AgGridReact<Order>
            theme={gridTheme}
            rowData={rows}
            columnDefs={cols}
            loading={orders.isLoading}
            domLayout="autoHeight"
            getRowId={(p) => p.data.id}
            onRowClicked={(e) => e.data && nav(`/orders/${e.data.id}`)}
            overlayNoRowsTemplate="No orders yet. Share a PayPal link in a chat and paid orders land here."
          />
        </div>
      </section>
    </main>
  )
}
