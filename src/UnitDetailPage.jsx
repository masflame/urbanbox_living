import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import AppShell from './components/AppShell'
import QuantityStepper from './components/QuantityStepper'
import { getUnitBySlug } from './data/unitsCatalog'
import { useCart } from './context/CartContext'

export default function UnitDetailPage() {
  const { slug } = useParams()
  const unit = getUnitBySlug(slug)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [previewIndex, setPreviewIndex] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()
  const navigate = useNavigate()

  if (!unit) {
    return <Navigate to="/units" replace />
  }

  const activeImageIndex = previewIndex ?? selectedIndex
  const selectedImage = unit.gallery[activeImageIndex] || unit.coverImage

  function handleBuyNow() {
    addItem(unit, quantity)
    navigate('/checkout')
  }

  return (
    <AppShell
      accentLabel={unit.category}
      heading={unit.name}
      intro={`${unit.collectionLabel} · ${unit.size.sizeLabel} · ${unit.leadTime}`}
    >
      <section className="content-section detail-layout compact-top">
        <div className="detail-gallery">
          <div className="detail-stage">
            {selectedImage ? <img src={selectedImage} alt={unit.name} /> : null}
          </div>
          <div className="detail-thumbnails">
            {unit.gallery.map((image, index) => (
              <button
                type="button"
                key={`${unit.id}-${index}`}
                className={index === selectedIndex ? 'thumbnail-button is-active' : 'thumbnail-button'}
                onMouseEnter={() => setPreviewIndex(index)}
                onMouseLeave={() => setPreviewIndex(null)}
                onFocus={() => setPreviewIndex(index)}
                onBlur={() => setPreviewIndex(null)}
                onClick={() => setSelectedIndex(index)}
              >
                <img src={image} alt={`${unit.name} preview ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <aside className="detail-sidebar">
          <div className="purchase-panel">
            <span className="detail-price">{unit.price.display}</span>
            {unit.convertedFromUsd ? <p className="detail-note">Converted from USD to ZAR for the storefront display.</p> : null}
            <p>{unit.description}</p>

            <div className="quantity-row">
              <label htmlFor="unit-quantity">Quantity</label>
              <QuantityStepper
                id="unit-quantity"
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={12}
              />
            </div>

            <div className="purchase-actions">
              <button type="button" className="button-primary" onClick={() => addItem(unit, quantity)}>
                Add to cart
              </button>
              <button type="button" className="button-secondary" onClick={handleBuyNow}>
                Buy now
              </button>
            </div>

            <Link to="/cart" className="text-link">
              Review cart before checkout
            </Link>
          </div>

          <div className="specs-panel">
            <h2>Unit snapshot</h2>
            <dl className="spec-list">
              {unit.specs.map(([label, value]) => (
                <div key={label} className="spec-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </section>

      <section className="content-section detail-copy-grid">
        <div className="detail-copy-card">
          <span className="page-eyebrow">Included</span>
          <ul className="bullet-list">
            {(unit.included.length ? unit.included : ['Included items available on enquiry']).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="detail-copy-card">
          <span className="page-eyebrow">Optional Extras</span>
          <ul className="bullet-list">
            {(unit.optionalExtras.length ? unit.optionalExtras : ['Optional upgrades vary by model']).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="detail-copy-card">
          <span className="page-eyebrow">Exclusions / Notes</span>
          <ul className="bullet-list">
            {[
              ...unit.excluded,
              unit.flatpackNote,
              unit.floorPlanNote,
            ]
              .filter(Boolean)
              .map((item) => (
                <li key={item}>{item}</li>
              ))}
          </ul>
        </div>
      </section>
    </AppShell>
  )
}