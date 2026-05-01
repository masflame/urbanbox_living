import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import { getUnitConfiguredTotal } from './components/UnitConfigurationRow'
import { EMPTY_CONFIG, summarize } from './components/Configurator'
import { useCart } from './context/CartContext'
import { useCheckout } from './context/CheckoutContext'
import { accountSupabase, ORDERS_TABLE } from './utils/supabase'
import { submitPayfastCheckout, isPayfastConfigured } from './utils/payfast'
import {
  estimateProjectTimeline,
  formatBuildRange,
  formatInstallRange,
} from './utils/timelineEstimate'
import './configurator.css'

// Deposit % per payment plan. Financing = R0 (application only, no Payfast).
const DEPOSIT_PERCENT = {
  standard: 0.5,
  flexible: 0.4,
  financing: 0,
}

// Financing is only available for orders at or above this threshold.
const FINANCING_MIN_AMOUNT = 500000

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value)
}

function rowKey(item, index) {
  return `${item.id || item.slug || 'unit'}-${index}`
}

function makeOrderNumber() {
  // Timestamp-based so Payfast m_payment_id is unique & deterministic.
  return `UBL-${Date.now().toString(36).toUpperCase()}`
}

const PAYMENT_OPTIONS = [
  { id: 'standard', label: 'Standard', detail: '50% deposit on order, 50% on delivery.' },
  { id: 'flexible', label: 'Flexible', detail: '40% deposit, 30% pre-delivery, 30% on handover.' },
  { id: 'financing', label: 'Financing', detail: '12 / 24 / 36 month plans subject to credit approval.' },
]

export default function PaymentPage() {
  const navigate = useNavigate()
  const { items, clearCart } = useCart()
  const {
    configs,
    delivery,
    paymentOption,
    setPaymentOption,
    submittedOrder,
    setSubmittedOrder,
    resetCheckout,
  } = useCheckout()

  const unitTotals = useMemo(
    () => items.map((item, index) => ({
      item,
      index,
      key: rowKey(item, index),
      total: getUnitConfiguredTotal(item, configs[rowKey(item, index)]),
    })),
    [items, configs],
  )
  const projectSubtotal = unitTotals.reduce((sum, u) => sum + u.total, 0)

  const timeline = useMemo(
    () => estimateProjectTimeline(items, configs),
    [items, configs],
  )
  const buildLabel = formatBuildRange(timeline)
  const installLabel = formatInstallRange(timeline)

  const depositPercent = DEPOSIT_PERCENT[paymentOption] ?? 0.5
  const depositAmount = Math.round(projectSubtotal * depositPercent)
  const isFinancing = paymentOption === 'financing'
  const financingAvailable = projectSubtotal >= FINANCING_MIN_AMOUNT

  // If the project drops below the financing threshold, fall back to the
  // flexible plan automatically so the user isn't stuck on a disabled option.
  useEffect(() => {
    if (!financingAvailable && paymentOption === 'financing') {
      setPaymentOption('flexible')
    }
  }, [financingAvailable, paymentOption, setPaymentOption])

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (processing) return
    setError(null)
    setProcessing(true)

    const orderNumber = makeOrderNumber()
    const unitProposals = items.map((item, index) => {
      const cfg = configs[rowKey(item, index)] || EMPTY_CONFIG
      const summary = summarize(cfg)
      return {
        name: item.name,
        quantity: item.quantity,
        basePrice: item.price?.amountZar ?? 0,
        addonTotal: summary.addonTotal,
        configuredTotal: getUnitConfiguredTotal(item, cfg),
        choices: summary.choiceLines,
        addons: summary.addonLines,
        packages: summary.packageLines,
        services: summary.serviceLines,
      }
    })

    const totalQty = items.reduce((s, i) => s + i.quantity, 0)
    const itemSummary = unitProposals
      .map((u) => `${u.quantity}× ${u.name}`)
      .join(', ')
      .slice(0, 250)
    // Pack everything else into description as JSON so we don't lose info.
    const descriptionPayload = JSON.stringify({
      payment_plan: paymentOption,
      deposit_amount: depositAmount,
      project_total: projectSubtotal,
      currency: 'ZAR',
      build_weeks_min: timeline.buildMinWeeks,
      build_weeks_max: timeline.buildMaxWeeks,
      install_days_min: timeline.installMinDays,
      install_days_max: timeline.installMaxDays,
      suburb: delivery.suburb || '',
      units: unitProposals,
    })

    const orderPayload = {
      order_id: orderNumber,
      first_name: (delivery.name || '').split(' ')[0] || delivery.name || '',
      last_name: (delivery.name || '').split(' ').slice(1).join(' ') || '',
      email: delivery.email || '',
      contact: delivery.phone || '',
      country: delivery.country || 'South Africa',
      street_address: [delivery.addressLine1, delivery.suburb]
        .filter(Boolean)
        .join(', '),
      apartment: delivery.addressLine2 || '',
      city: delivery.city || '',
      province: delivery.province || '',
      postal_code: delivery.postalCode || '',
      item: itemSummary,
      description: descriptionPayload,
      quantity: totalQty,
      amount: isFinancing ? 0 : depositAmount,
      device:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : '',
      status: isFinancing ? 'financing_application' : 'pending_payment',
    }

    // 1) Save to Supabase Orders table (best-effort: log + continue if it fails).
    if (accountSupabase) {
      const { error: dbError } = await accountSupabase
        .from(ORDERS_TABLE)
        .insert([orderPayload])
      if (dbError) {
        console.error('Supabase order insert failed:', {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
        })
        // Don't block checkout if DB fails - Payfast notify can reconcile later.
      }
    } else {
      console.warn('accountSupabase not configured - skipping order save')
    }

    // 2) Financing = no payment now, just confirmation screen.
    if (isFinancing) {
      setSubmittedOrder({
        orderNumber,
        projectSubtotal,
        depositAmount: 0,
        paymentOption,
        timeline,
        unitProposals,
        delivery,
      })
      clearCart()
      setProcessing(false)
      return
    }

    // 3) Otherwise redirect to Payfast for the deposit.
    if (!isPayfastConfigured()) {
      setError('Payfast is not configured. Please contact support.')
      setProcessing(false)
      return
    }

    // Persist the order so the success / cancelled pages can show details
    // after Payfast bounces the user back.
    try {
      window.localStorage.setItem(
        'urbanbox:last-order',
        JSON.stringify({
          orderNumber,
          projectSubtotal,
          depositAmount,
          paymentOption,
          timeline,
          unitProposals,
          delivery,
        }),
      )
    } catch (storageErr) {
      console.warn('Could not persist last order:', storageErr)
    }

    try {
      const itemDescription = unitProposals
        .map((u) => `${u.quantity}× ${u.name}`)
        .join(', ')
      submitPayfastCheckout({
        orderId: orderNumber,
        amount: depositAmount,
        itemName: `UrbanBox deposit ${orderNumber}`,
        itemDescription,
        firstName: orderPayload.first_name,
        lastName: orderPayload.last_name,
        email: orderPayload.email,
        cellNumber: orderPayload.contact,
      })
      // Page is now redirecting to Payfast. Leave processing=true so the
      // button stays disabled while the form submits.
    } catch (err) {
      console.error('Payfast redirect failed:', err)
      setError(err.message || 'Could not start payment. Please try again.')
      setProcessing(false)
    }
  }

  if (submittedOrder) {
    return (
      <AppShell
        accentLabel="Project quote captured"
        heading="Mock proposal submitted"
        intro="No payment was taken. This is a storefront proof of flow."
      >
        <section className="content-section compact-top success-panel">
          <span className="page-eyebrow">Reference</span>
          <h2>{submittedOrder.orderNumber}</h2>
          <p>
            Estimated project total: <strong>{formatCurrency(submittedOrder.projectSubtotal)}</strong> ·
            Build {submittedOrder.timeline ? formatBuildRange(submittedOrder.timeline) : '-'} · Install {submittedOrder.timeline ? formatInstallRange(submittedOrder.timeline) : '-'} ·
            {' '}{PAYMENT_OPTIONS.find((p) => p.id === submittedOrder.paymentOption)?.label} payment plan.
          </p>
          <p className="field-note">
            Quote sent to <strong>{submittedOrder.delivery.email || '-'}</strong>
            {submittedOrder.delivery.province ? ` · Delivery to ${submittedOrder.delivery.province}` : ''}.
          </p>

          {submittedOrder.unitProposals.map((u, i) => (
            <div key={i} className="success-unit-block">
              <h3>Unit {i + 1} - {u.name} (× {u.quantity})</h3>
              <p>
                Base {formatCurrency(u.basePrice)} · Add-ons {formatCurrency(u.addonTotal)} ·
                {' '}<strong>Configured Total {formatCurrency(u.configuredTotal)}</strong>
              </p>
              {u.choices.length > 0 && (
                <ul className="success-unit-list">
                  {u.choices.map((c) => (
                    <li key={c.group}>• {c.group}: {c.value}</li>
                  ))}
                </ul>
              )}
              {(u.addons.length > 0 || u.packages.length > 0) && (
                <ul className="success-unit-list">
                  {u.addons.map((a) => (
                    <li key={a.id}>+ {a.label}{a.sub ? ` (${a.sub})` : ''} - {formatCurrency(a.price)}</li>
                  ))}
                  {u.packages.map((p) => (
                    <li key={p.id}>+ {p.label} - {formatCurrency(p.price)}</li>
                  ))}
                </ul>
              )}
              {u.services.length > 0 && (
                <ul className="success-unit-list">
                  {u.services.map((s) => (
                    <li key={s.id}>· {s.label} (quoted separately)</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="hero-actions">
            <Link to="/units" className="button-primary" onClick={() => resetCheckout()}>Back to units</Link>
            <Link to="/" className="button-secondary" onClick={() => resetCheckout()}>Back home</Link>
          </div>
        </section>
      </AppShell>
    )
  }

  if (!items.length) {
    return (
      <AppShell
        accentLabel="Payment"
        heading="Your project is empty"
        intro="Add units before proceeding to payment."
      >
        <section className="content-section compact-top">
          <div className="hero-actions">
            <Link to="/units" className="button-primary">Browse units</Link>
          </div>
        </section>
      </AppShell>
    )
  }

  if (
    !delivery.name ||
    !delivery.email ||
    !delivery.phone ||
    !delivery.addressLine1 ||
    !delivery.suburb ||
    !delivery.city ||
    !delivery.province ||
    !delivery.postalCode
  ) {
    return (
      <AppShell
        accentLabel="Checkout · Step 3"
        heading="Delivery details required"
        intro="Please complete delivery information before payment."
      >
        <section className="content-section compact-top">
          <div className="hero-actions">
            <Link to="/checkout/delivery" className="button-primary">Go to delivery details</Link>
            <Link to="/checkout" className="button-secondary">Back to project cart</Link>
          </div>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell
      accentLabel="Checkout · Step 3"
      heading="Payment Information"
      intro="Choose a payment plan to finalise your proposal request."
    >
      <section className="content-section cart-layout compact-top">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <ol className="checkout-step-indicator" aria-label="Checkout progress">
            <li className="checkout-step is-done"><span className="checkout-step-num">1</span> Project Cart</li>
            <li className="checkout-step is-done"><span className="checkout-step-num">2</span> Delivery</li>
            <li className="checkout-step is-active"><span className="checkout-step-num">3</span> Payment</li>
          </ol>

          <div className="project-payment">
            <span className="project-payment-label">Payment option</span>
            <div className="project-payment-list">
              {PAYMENT_OPTIONS.map((p) => {
                const selected = paymentOption === p.id
                const disabled = p.id === 'financing' && !financingAvailable
                const classes = [
                  'project-payment-card',
                  selected ? 'is-selected' : '',
                  disabled ? 'is-disabled' : '',
                ].filter(Boolean).join(' ')
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={classes}
                    onClick={() => { if (!disabled) setPaymentOption(p.id) }}
                    disabled={disabled}
                    aria-disabled={disabled}
                    title={disabled ? `Available for orders of ${formatCurrency(FINANCING_MIN_AMOUNT)} or more` : undefined}
                  >
                    <span className="project-payment-card-title">{p.label}</span>
                    <span className="project-payment-card-detail">
                      {p.detail}
                      {disabled && (
                        <>
                          <br />
                          <em>Available for orders of {formatCurrency(FINANCING_MIN_AMOUNT)} or more.</em>
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="field-note" style={{ color: '#b3261e' }}>{error}</p>
          )}

          <div className="project-actions">
            <Link to="/checkout/delivery" className="button-secondary">Back to Delivery</Link>
            <button type="submit" className="button-primary" disabled={processing}>
              {processing
                ? 'Processing…'
                : isFinancing
                ? 'Submit financing application'
                : `Pay deposit ${formatCurrency(depositAmount)}`}
            </button>
          </div>
        </form>

        <aside className="summary-panel project-totals-panel">
          <span className="page-eyebrow">Project totals</span>
          <h2>Proposal summary</h2>

          <ul className="project-totals-list">
            {unitTotals.map((u) => (
              <li key={u.key}>
                <span>Unit {u.index + 1} · {u.item.name}{u.item.quantity > 1 ? ` × ${u.item.quantity}` : ''}</span>
                <strong>{formatCurrency(u.total)}</strong>
              </li>
            ))}
          </ul>

          <div className="summary-row summary-row-total">
            <span>Project Subtotal</span>
            <strong>{formatCurrency(projectSubtotal)}</strong>
          </div>

          {!isFinancing && (
            <div className="summary-row">
              <span>Deposit due now ({Math.round(depositPercent * 100)}%)</span>
              <strong>{formatCurrency(depositAmount)}</strong>
            </div>
          )}
          {isFinancing && (
            <div className="summary-row">
              <span>Due now</span>
              <strong>R0 (application only)</strong>
            </div>
          )}

          <div className="project-timeline">
            <div>
              <span className="project-timeline-label">Estimated Build</span>
              <strong>{buildLabel}</strong>
            </div>
            <div>
              <span className="project-timeline-label">Estimated Installation</span>
              <strong>{installLabel}</strong>
            </div>
          </div>

          <div className="delivery-recap">
            <span className="page-eyebrow">Delivering to</span>
            <p>
              <strong>{delivery.name}</strong><br />
              {delivery.email} · {delivery.phone}<br />
              {delivery.addressLine1}{delivery.addressLine2 ? `, ${delivery.addressLine2}` : ''}<br />
              {delivery.suburb}, {delivery.city}<br />
              {delivery.province} {delivery.postalCode}<br />
              {delivery.country}
            </p>
          </div>
        </aside>
      </section>
    </AppShell>
  )
}
