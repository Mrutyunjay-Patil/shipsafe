import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { BottomNav } from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { api, MOCK } from '@/lib/api'
import Ask from '@/pages/Ask'
import Home from '@/pages/Home'
import OrderDetail from '@/pages/OrderDetail'
import Orders from '@/pages/Orders'
import Sell from '@/pages/Sell'
import SignIn from '@/pages/SignIn'
import Thanks from '@/pages/Thanks'

// AG Grid is large, so the board loads only when opened.
const Board = lazy(() => import('@/pages/Board'))

export default function App() {
  const me = useQuery({ queryKey: ['me'], queryFn: api.me })
  const loc = useLocation()

  if (location.pathname === '/thanks') return <Thanks />
  if (me.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-5 pt-12">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    )
  }
  if (!me.data?.signedIn) return <SignIn />

  return (
    <div className="min-h-dvh pb-28">
      {MOCK && (
        <div className="bg-brand px-4 py-1.5 text-center text-xs font-medium text-brand-foreground">
          Preview with sample data. Nothing is sent to PayPal.
        </div>
      )}
      <div key={loc.pathname} className="page-in">
      <Routes location={loc}>
        <Route path="/" element={<Home seller={me.data.seller} />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/board" element={<Suspense fallback={<Skeleton className="m-5 h-96 rounded-2xl" />}><Board /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
