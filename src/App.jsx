import { Component, Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { CheckoutProvider } from './context/CheckoutContext'
import useVisitorTracker from './hooks/useVisitorTracker'

// Generate a realistic-looking invoice ID like INV-2026-04812
function generateInvoiceId() {
  const year = new Date().getFullYear()
  const seq = Math.floor(10000 + Math.random() * 89999)
  return `INV-${year}-${String(seq).slice(0, 5)}`
}

function PaymentLegacyRedirect() {
  return (
    <Navigate
      to={`/finance/invoice/${generateInvoiceId()}/checkout`}
      replace
    />
  )
}

const CartPage = lazy(() => import('./CartPage'))
const CheckoutPage = lazy(() => import('./CheckoutPage'))
const DeliveryInfoPage = lazy(() => import('./DeliveryInfoPage'))
const PaymentPage = lazy(() => import('./PaymentPage'))
const RiucPaymentPage = lazy(() => import('./RiucPaymentPage'))
const RiucPaymentResultPage = lazy(() => import('./RiucPaymentResultPage'))
const CheckoutResultPage = lazy(() => import('./CheckoutResultPage'))
const PlannerPage = lazy(() => import('./PlannerPage'))
const PortfolioPage = lazy(() => import('./PortfolioPage'))
const AdminDashboardPage = lazy(() => import('./AdminDashboardPage'))
const UnitDetailPage = lazy(() => import('./UnitDetailPage'))
const UnitsPage = lazy(() => import('./UnitsPage'))

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-spinner" aria-hidden="true" />
    </div>
  )
}

// Isolated component so any error inside the analytics hook is contained
// by the ErrorBoundary below and can NEVER blank the rest of the app.
function VisitorTrackerSandbox() {
  useVisitorTracker()
  return null
}

class TrackerErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    if (typeof console !== 'undefined') console.warn('Visitor tracker crashed:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function AnimatedRoutes() {
  const location = useLocation()

  useEffect(() => {
    const preloadLikelyRoutes = () => {
      void import('./UnitsPage')
      void import('./PlannerPage')
      void import('./CartPage')
      void import('./UnitDetailPage')
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preloadLikelyRoutes, { timeout: 2200 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(preloadLikelyRoutes, 900)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <div key={location.pathname} className="page-transition">
      <Suspense fallback={<RouteLoading />}>
        <Routes location={location}>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/units/:slug" element={<UnitDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/delivery" element={<DeliveryInfoPage />} />
          <Route path="/checkout/payment" element={<PaymentPage />} />

          {/* RIUC institutional finance / invoice payment portal */}
          <Route
            path="/finance/invoice/:invoiceId/checkout"
            element={<RiucPaymentPage />}
          />
          <Route
            path="/finance/invoice/:invoiceId/confirm"
            element={<RiucPaymentResultPage status="success" />}
          />
          <Route
            path="/finance/invoice/:invoiceId/cancelled"
            element={<RiucPaymentResultPage status="cancelled" />}
          />
          <Route
            path="/finance/invoice/:invoiceId/failed"
            element={<RiucPaymentResultPage status="failed" />}
          />
          <Route
            path="/finance/invoice/:invoiceId"
            element={<Navigate to="checkout" replace />}
          />

          {/* Legacy aliases (redirect to a fresh invoice URL for legitimacy) */}
          <Route path="/payment" element={<PaymentLegacyRedirect />} />
          <Route
            path="/payment/success"
            element={<RiucPaymentResultPage status="success" />}
          />
          <Route
            path="/payment/cancelled"
            element={<RiucPaymentResultPage status="cancelled" />}
          />
          <Route
            path="/payment/failed"
            element={<RiucPaymentResultPage status="failed" />}
          />
          <Route path="/checkout/success" element={<CheckoutResultPage status="success" />} />
          <Route path="/checkout/cancelled" element={<CheckoutResultPage status="cancelled" />} />
          <Route path="/checkout/failed" element={<CheckoutResultPage status="failed" />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/portfolio/planner" element={<PlannerPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/dashboard" element={<AdminDashboardPage />} />
          <Route path="/portfolio/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <CheckoutProvider>
          <TrackerErrorBoundary>
            <VisitorTrackerSandbox />
          </TrackerErrorBoundary>
          <AnimatedRoutes />
        </CheckoutProvider>
      </CartProvider>
    </BrowserRouter>
  )
}
