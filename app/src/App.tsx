import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { BottomNav } from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { api, MOCK } from '@/lib/api'
import Account from '@/pages/Account'
import Ask from '@/pages/Ask'
import Home from '@/pages/Home'
import OrderDetail from '@/pages/OrderDetail'
import ProductDetail from '@/pages/ProductDetail'
import Products from '@/pages/Products'
import Sell from '@/pages/Sell'
import SignIn from '@/pages/SignIn'
import Thanks from '@/pages/Thanks'

// AG Grid is large, so the orders board loads only when opened.
const Orders = lazy(() => import('@/pages/Orders'))

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
        <div className="bg-ink px-4 py-1.5 text-center text-xs font-medium text-paper">
          Preview with sample data. Nothing is sent to PayPal.
        </div>
      )}
      <div key={loc.pathname} className="page-in">
      <Routes location={loc}>
        <Route path="/" element={<Home seller={me.data.seller} />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/orders" element={<Suspense fallback={<Skeleton className="m-5 h-96 rounded-2xl" />}><Orders /></Suspense>} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/account" element={<Account />} />
        <Route path="/board" element={<Navigate to="/orders" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
