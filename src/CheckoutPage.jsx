import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import UnitConfigurationRow, { getUnitConfiguredTotal } from './components/UnitConfigurationRow'
import { EMPTY_CONFIG } from './components/Configurator'
import { useCart } from './context/CartContext'
import { useCheckout } from './context/CheckoutContext'
import {
  estimateProjectTimeline,
  formatBuildRange,
  formatInstallRange,
} from './utils/timelineEstimate'
import './configurator.css'

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

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, removeItem } = useCart()
  const { configs, setConfig, setConfigs } = useCheckout()

  const [openSet, setOpenSet] = useState(() => new Set([0]))

  const setRowExpanded = useCallback((index, open) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (open) next.add(index); else next.delete(index)
      return next
    })
  }, [])

  function handleDuplicate(index) {
    const key = rowKey(items[index], index)
    const cfg = configs[key] || EMPTY_CONFIG
    const dupKey = `${key}__dup-${Date.now()}`
    setConfigs((prev) => ({ ...prev, [dupKey]: cfg }))
    window.alert('Configuration duplicated for this unit. Add another unit from the catalogue to assign it.')
  }

  function handleCopyToSimilar(index) {
    const source = items[index]
    if (!source) return
    const cfg = configs[rowKey(source, index)] || EMPTY_CONFIG
    setConfigs((prev) => {
      const next = { ...prev }
      items.forEach((other, otherIndex) => {
        if (otherIndex === index) return
        if (other.slug === source.slug || other.id === source.id) {
          next[rowKey(other, otherIndex)] = cfg
        }
      })
      return next
    })
  }

  function handleRemove(index) {
    const item = items[index]
    if (!item) return
    if (!window.confirm(`Remove ${item.name} from this project?`)) return
    setConfigs((prev) => {
      const next = { ...prev }
      delete next[rowKey(item, index)]
      return next
    })
    removeItem(item.id)
  }

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

  function similarCount(item, index) {
    return items.filter(
      (other, otherIndex) =>
        otherIndex !== index && (other.slug === item.slug || other.id === item.id),
    ).length
  }

  function handleContinue() {
    navigate('/checkout/delivery')
  }

  if (!items.length) {
    return (
      <AppShell
        accentLabel="Project Cart"
        heading="Your project is empty"
        intro="Add units from the catalogue to start building your proposal."
      >
        <section className="content-section compact-top">
          <p>No units in cart. Browse the catalogue to add configurable units.</p>
          <div className="hero-actions">
            <Link to="/units" className="button-primary">Browse units</Link>
          </div>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell
      accentLabel="Project Cart"
      heading="Configure & Quote"
      intro="Each unit is configured independently. When you're ready, continue to delivery details."
    >
      <section className="content-section cart-layout compact-top">
        <div className="checkout-form">
          <ol className="checkout-step-indicator" aria-label="Checkout progress">
            <li className="checkout-step is-active"><span className="checkout-step-num">1</span> Project Cart</li>
            <li className="checkout-step"><span className="checkout-step-num">2</span> Delivery</li>
            <li className="checkout-step"><span className="checkout-step-num">3</span> Payment</li>
          </ol>

          <div className="project-cart">
            <div className="project-cart-head">
              <span className="page-eyebrow">Project Cart</span>
              <h3>{items.length} configurable unit{items.length === 1 ? '' : 's'}</h3>
              <p>Expand any unit to configure it independently.</p>
            </div>

            <div className="project-cart-list">
              {items.map((item, index) => {
                const key = rowKey(item, index)
                return (
                  <UnitConfigurationRow
                    key={key}
                    index={index}
                    item={item}
                    config={configs[key] || EMPTY_CONFIG}
                    expanded={openSet.has(index)}
                    onToggleExpanded={() => setRowExpanded(index, !openSet.has(index))}
                    onConfigChange={(next) => setConfig(key, next)}
                    onDuplicate={() => handleDuplicate(index)}
                    onCopyToSimilar={() => handleCopyToSimilar(index)}
                    onRemove={() => handleRemove(index)}
                    hasSimilarUnits={similarCount(item, index) > 0}
                  />
                )
              })}
            </div>
          </div>

          <div className="project-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => window.alert('Project saved locally.')}
            >
              Save Project
            </button>
            <button type="button" className="button-primary" onClick={handleContinue}>
              Checkout - Continue to Delivery
            </button>
          </div>
        </div>

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
        </aside>
      </section>
    </AppShell>
  )
}
