import { useQuery } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { StatusBadge } from '@/components/StatusBadge'
import { api, money, type Order } from '@/lib/api'

ModuleRegistry.registerModules([AllCommunityModule])

// AG Grid picks up the app's colours from theme.css through CSS variables.
const gridTheme = themeQuartz.withParams({
  fontFamily: 'var(--brand-font)',
  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--foreground)',
  headerBackgroundColor: 'var(--muted)',
  borderColor: 'var(--border)',
  accentColor: 'var(--brand)',
  rowHoverColor: 'var(--accent)',
  borderRadius: 12,
  wrapperBorderRadius: 18,
})

export default function Board() {
  const nav = useNavigate()
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders, refetchInterval: 20_000 })
  const cols = useMemo<ColDef<Order>[]>(() => [
    { field: 'status', headerName: 'Status', width: 150, cellRenderer: (p: ICellRendererParams<Order>) => p.data && <StatusBadge status={p.data.status} />, filter: true },
    { field: 'title', headerName: 'Item', flex: 1.4, minWidth: 180 },
    { field: 'variant', headerName: 'Colour', width: 110 },
    { field: 'amount', headerName: 'Amount', width: 110, valueFormatter: (p) => (p.data ? money(p.value, p.data.currency) : ''), cellClass: 'money' },
    { headerName: 'Ship to', flex: 1, minWidth: 160, valueGetter: (p) => [p.data?.ship_city, p.data?.ship_postcode, p.data?.ship_country].filter(Boolean).join(' ') },
    { field: 'tracking_number', headerName: 'Tracking', width: 160, cellClass: 'font-mono' },
    { field: 'seller_protection', headerName: 'Seller protection', width: 150 },
    { field: 'paid_at', headerName: 'Paid', width: 170, sort: 'desc', valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '') },
    { field: 'id', headerName: 'PayPal order', width: 180, cellClass: 'font-mono text-xs' },
  ], [])

  return (
    <main className="mx-auto max-w-7xl px-5 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="flex items-end justify-between py-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Order board</h1>
          <p className="text-sm text-muted-foreground">Every PayPal order, its tracking and its protection status. Best on a laptop.</p>
        </div>
      </header>
      <div className="h-[calc(100dvh-12rem)] min-h-96">
        <AgGridReact<Order>
          theme={gridTheme}
          rowData={orders.data ?? []}
          columnDefs={cols}
          loading={orders.isLoading}
          rowHeight={52}
          onRowClicked={(e) => e.data && nav(`/orders/${e.data.id}`)}
          overlayNoRowsTemplate="No orders yet"
        />
      </div>
    </main>
  )
}
