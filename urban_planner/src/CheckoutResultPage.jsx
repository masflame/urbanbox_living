import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppShell from './components/AppShell'
import { useCart } from './context/CartContext'
import { useCheckout } from './context/CheckoutContext'
import { accountSupabase, ORDERS_TABLE } from './utils/supabase'
import './configurator.css'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function readLastOrder() {
  try {
    const raw = window.localStorage.getItem('urbanbox:last-order')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearLastOrder() {
  try {
    window.localStorage.removeItem('urbanbox:last-order')
  } catch {
    // ignore
  }
}

const PLAN_LABELS = {
  standard: 'Standard plan',
  flexible: 'Flexible plan',
  financing: 'Financing plan',
}

/**
 * Single component used for /checkout/success, /checkout/cancelled
 * and /checkout/failed. Behaviour is driven by the `status` prop.
 */
export default function CheckoutResultPage({ status }) {
  const { clearCart } = useCart()
  const { resetCheckout } = useCheckout()
  const [params] = useSearchParams()
  const [order] = useState(() => readLastOrder())

  // Payfast may pass back m_payment_id on the return URL - fall back to that.
  const orderNumber = order?.orderNumber || params.get('m_payment_id') || null

  const isSuccess = status === 'success'
  const isCancelled = status === 'cancelled'
  const isFailed = status === 'failed'

  // Stable refs so we don't re-trigger the effect (and re-PATCH Supabase
  // forever) just because clearCart / resetCheckout get a new identity.
  const clearCartRef = useRef(clearCart)
  const resetCheckoutRef = useRef(resetCheckout)
  clearCartRef.current = clearCart
  resetCheckoutRef.current = resetCheckout

  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    if (isSuccess) {
      clearCartRef.current?.()
      resetCheckoutRef.current?.()
      if (orderNumber && accountSupabase) {
        accountSupabase
          .from(ORDERS_TABLE)
          .update({ status: 'paid' })
          .eq('order_id', orderNumber)
          .then(({ error }) => {
            if (error)
              console.warn('Could not mark order paid:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
              })
          })
      }
      const timeoutId = window.setTimeout(clearLastOrder, 60_000)
      return () => window.clearTimeout(timeoutId)
    }

    if (isCancelled && orderNumber && accountSupabase) {
      accountSupabase
        .from(ORDERS_TABLE)
        .update({ status: 'cancelled' })
        .eq('order_id', orderNumber)
        .then(({ error }) => {
          if (error) console.warn('Could not mark order cancelled:', error)
        })
    }

    if (isFailed && orderNumber && accountSupabase) {
      accountSupabase
        .from(ORDERS_TABLE)
        .update({ status: 'failed' })
        .eq('order_id', orderNumber)
        .then(({ error }) => {
          if (error) console.warn('Could not mark order failed:', error)
        })
    }
  }, [isSuccess, isCancelled, isFailed, orderNumber])

  const config = useMemo(() => {
    if (isSuccess) {
      return {
        accent: 'Payment received',
        heading: 'Thank you - your deposit is confirmed',
        intro:
          'We have received your deposit and our team will be in touch within one business day to confirm next steps.',
        tone: 'success',
      }
    }
    if (isCancelled) {
      return {
        accent: 'Payment cancelled',
        heading: 'Your payment was cancelled',
        intro:
          'No money has been taken. Your project is still saved - you can return to checkout to try again.',
        tone: 'warning',
      }
    }
    return {
      accent: 'Payment failed',
      heading: 'Something went wrong with your payment',
      intro:
        'Your bank or Payfast reported a problem. No funds have been captured. Please try again or contact support.',
      tone: 'error',
    }
  }, [isSuccess, isCancelled, isFailed])

  return (
    <AppShell
      accentLabel={config.accent}
      heading={config.heading}
      intro={config.intro}
    >
      <section className="content-section compact-top success-panel">
        {orderNumber && (
          <>
            <span className="page-eyebrow">Order reference</span>
            <h2 style={{ marginTop: 4 }}>{orderNumber}</h2>
          </>
        )}

        {order && (
          <>
            <p>
              {isSuccess ? 'Deposit paid' : 'Deposit due'}:{' '}
              <strong>{formatCurrency(order.depositAmount)}</strong>
              {' · '}
              Project total:{' '}
              <strong>{formatCurrency(order.projectSubtotal)}</strong>
              {order.paymentOption && (
                <>
                  {' · '}
                  {PLAN_LABELS[order.paymentOption] || order.paymentOption}
                </>
              )}
            </p>

            {order.delivery?.email && (
              <p className="field-note">
                Confirmation sent to <strong>{order.delivery.email}</strong>
                {order.delivery.province
                  ? ` · Delivery to ${order.delivery.province}`
                  : ''}
                .
              </p>
            )}

            {Array.isArray(order.unitProposals) &&
              order.unitProposals.map((u, i) => (
                <div key={i} className="success-unit-block">
                  <h3>
                    Unit {i + 1} - {u.name} (× {u.quantity})
                  </h3>
                  <p>
                    Base {formatCurrency(u.basePrice)} · Add-ons{' '}
                    {formatCurrency(u.addonTotal)} ·{' '}
                    <strong>
                      Configured Total {formatCurrency(u.configuredTotal)}
                    </strong>
                  </p>
                </div>
              ))}
          </>
        )}

        {!order && !orderNumber && (
          <p className="field-note">
            We couldn't find any local order details for this session. If you
            were charged, please contact support with the email used at
            checkout.
          </p>
        )}

        <div className="hero-actions" style={{ marginTop: 24 }}>
          {isSuccess && (
            <>
              <Link to="/" className="button-primary">Back home</Link>
              <Link to="/units" className="button-secondary">Browse more units</Link>
            </>
          )}
          {isCancelled && (
            <>
              <Link to="/checkout/payment" className="button-primary">
                Return to payment
              </Link>
              <Link to="/cart" className="button-secondary">Review cart</Link>
            </>
          )}
          {isFailed && (
            <>
              <Link to="/checkout/payment" className="button-primary">
                Try payment again
              </Link>
              <Link to="/" className="button-secondary">Back home</Link>
            </>
          )}
        </div>
      </section>
    </AppShell>
  )
}
