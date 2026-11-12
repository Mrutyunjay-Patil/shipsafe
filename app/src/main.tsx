import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import App from './App'
import './index.css'

// Keep the phone's browser bar in the current theme's ink, whichever data-theme and mode is active.
const syncThemeColor = () => {
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ink || '#f3f6fc')
}
new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
requestAnimationFrame(syncThemeColor)

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
})

// A data router, so pages can use useBlocker to guard unsaved edits.
const router = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
