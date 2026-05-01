import { useState } from 'react'
import Configurator, { EMPTY_CONFIG, summarize } from './Configurator'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', maximumFractionDigits: 0,
  }).format(value)
}

const THUMB_VIEWS = [
  { id: 'front', label: 'Front View', tone: 'linear-gradient(135deg, #d8d3c4 0%, #b8b1a0 100%)' },
  { id: 'interior', label: 'Interior', tone: 'linear-gradient(135deg, #eef1e8 0%, #c8d1b6 100%)' },
  { id: 'side', label: 'Side View', tone: 'linear-gradient(135deg, #c8c2b3 0%, #948c7b 100%)' },
  { id: 'layout', label: 'Layout', tone: 'linear-gradient(135deg, #e9e6dc 0%, #c0bbab 100%)' },
  { id: 'material', label: 'Material', tone: 'linear-gradient(135deg, #b6884e 0%, #8c5e2c 100%)' },
]

function UnitThumbnailStrip({ coverImage, productName, activeView, onViewChange }) {
  const active = THUMB_VIEWS.find((v) => v.id === activeView) || THUMB_VIEWS[0]
  return (
    <div className="unit-thumb-strip">
      <div className="unit-thumb-preview">
        {coverImage ? (
          <img src={coverImage} alt={productName} />
        ) : (
          <div className="unit-thumb-placeholder" style={{ background: active.tone }} />
        )}
        <span className="unit-thumb-preview-label">{active.label}</span>
      </div>
      <div className="unit-thumb-rail" role="tablist" aria-label="Product views">
        {THUMB_VIEWS.map((v) => {
          const selected = v.id === active.id
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`unit-thumb-tile ${selected ? 'is-selected' : ''}`}
              onClick={() => onViewChange(v.id)}
            >
              {v.id === 'front' && coverImage ? (
                <img src={coverImage} alt="" />
              ) : (
                <span className="unit-thumb-art" style={{ background: v.tone }} />
              )}
              <span className="unit-thumb-tile-label">{v.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function UnitConfigurationRow({
  index,
  item,
  config,
  expanded,
  onToggleExpanded,
  onConfigChange,
  onDuplicate,
  onCopyToSimilar,
  onRemove,
  hasSimilarUnits,
}) {
  const [activeView, setActiveView] = useState('front')

  const basePrice = item.price?.amountZar ?? 0
  const summary = summarize(config)
  const unitConfiguredTotal = (basePrice + summary.addonTotal) * item.quantity

  return (
    <div className={`unit-row ${expanded ? 'is-expanded' : ''}`}>
      <div className="unit-row-head">
        <button
          type="button"
          className="unit-row-summary"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
        >
          <span className="unit-row-thumb">
            {item.coverImage ? (
              <img src={item.coverImage} alt={item.name} />
            ) : (
              <span className="unit-thumb-art" style={{ background: THUMB_VIEWS[0].tone }} />
            )}
          </span>
          <span className="unit-row-titles">
            <span className="unit-row-eyebrow">Unit {index + 1}</span>
            <span className="unit-row-name">{item.name}</span>
            <span className="unit-row-meta">
              Qty {item.quantity} · Starting {formatCurrency(basePrice)}
            </span>
          </span>
          <span className="unit-row-total">
            <span className="unit-row-total-label">Configured</span>
            <strong>{formatCurrency(unitConfiguredTotal)}</strong>
          </span>
          <span className="unit-row-chevron" aria-hidden="true">▾</span>
        </button>

        <div className="unit-row-actions">
          <button type="button" className="unit-action" onClick={onDuplicate}>
            Duplicate
          </button>
          <button
            type="button"
            className="unit-action"
            onClick={onCopyToSimilar}
            disabled={!hasSimilarUnits}
            title={hasSimilarUnits ? 'Apply this config to other units of the same product' : 'No similar units in cart'}
          >
            Copy to similar
          </button>
          <button type="button" className="unit-action unit-action-danger" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>

      <div className="unit-row-collapse" aria-hidden={!expanded}>
        <div className="unit-row-collapse-inner">
          <div className="unit-row-body">
            <UnitThumbnailStrip
              coverImage={item.coverImage}
              productName={item.name}
              activeView={activeView}
              onViewChange={setActiveView}
            />

            <Configurator value={config} onChange={onConfigChange} />

            <div className="unit-row-summary-panel">
              <h4>Per-unit summary</h4>
              <div className="unit-summary-grid">
                <div className="unit-summary-line">
                  <span>Base price</span>
                  <strong>{formatCurrency(basePrice)}</strong>
                </div>
                {summary.choiceLines.length > 0 && (
                  <div className="unit-summary-block">
                    <span className="unit-summary-block-label">Selections</span>
                    <ul>
                      {summary.choiceLines.map((l) => (
                        <li key={l.group}>
                          <span>{l.group}</span>
                          <span className="unit-summary-meta">{l.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.addonLines.length > 0 && (
                  <div className="unit-summary-block">
                    <span className="unit-summary-block-label">Add-ons</span>
                    <ul>
                      {summary.addonLines.map((l) => (
                        <li key={l.id}>
                          <span>{l.label}{l.sub ? ` (${l.sub})` : ''}</span>
                          <strong>+{formatCurrency(l.price)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.packageLines.length > 0 && (
                  <div className="unit-summary-block">
                    <span className="unit-summary-block-label">Packages</span>
                    <ul>
                      {summary.packageLines.map((l) => (
                        <li key={l.id}>
                          <span>{l.label}</span>
                          <strong>+{formatCurrency(l.price)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.quantity > 1 && (
                  <div className="unit-summary-line">
                    <span>Qty × {item.quantity}</span>
                    <strong>{formatCurrency((basePrice + summary.addonTotal) * item.quantity)}</strong>
                  </div>
                )}
                <div className="unit-summary-line unit-summary-line-total">
                  <span>Configured Total</span>
                  <strong>{formatCurrency(unitConfiguredTotal)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function getUnitConfiguredTotal(item, config) {
  const basePrice = item.price?.amountZar ?? 0
  const summary = summarize(config || EMPTY_CONFIG)
  return (basePrice + summary.addonTotal) * item.quantity
}
