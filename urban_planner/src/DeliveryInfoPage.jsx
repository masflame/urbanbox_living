import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import { getUnitConfiguredTotal } from './components/UnitConfigurationRow'
import { useCart } from './context/CartContext'
import { useCheckout } from './context/CheckoutContext'
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

const PROVINCES = [
  'Western Cape',
  'Gauteng',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Other',
]

export default function DeliveryInfoPage() {
  const navigate = useNavigate()
  const { items } = useCart()
  const { configs, delivery, updateDelivery } = useCheckout()

  const projectSubtotal = useMemo(
    () => items.reduce(
      (sum, item, index) => sum + getUnitConfiguredTotal(item, configs[rowKey(item, index)]),
      0,
    ),
    [items, configs],
  )

  if (!items.length) {
    return (
      <AppShell
        accentLabel="Delivery"
        heading="Your project is empty"
        intro="Add units before continuing to delivery details."
      >
        <section className="content-section compact-top">
          <div className="hero-actions">
            <Link to="/units" className="button-primary">Browse units</Link>
          </div>
        </section>
      </AppShell>
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    navigate('/checkout/payment')
  }

  function field(name, value) {
    return (event) => updateDelivery({ [name]: event.target.value })
  }

  return (
    <AppShell
      accentLabel="Checkout · Step 2"
      heading="Delivery & Contact"
      intro="Tell us where the project lives and who we should reach. You'll review payment in the next step."
    >
      <section className="content-section cart-layout compact-top">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <ol className="checkout-step-indicator" aria-label="Checkout progress">
            <li className="checkout-step is-done"><span className="checkout-step-num">1</span> Project Cart</li>
            <li className="checkout-step is-active"><span className="checkout-step-num">2</span> Delivery</li>
            <li className="checkout-step"><span className="checkout-step-num">3</span> Payment</li>
          </ol>

          <div className="form-grid two-columns">
            <label>
              Full name
              <input
                type="text"
                required
                name="name"
                value={delivery.name}
                onChange={field('name')}
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                name="email"
                value={delivery.email}
                onChange={field('email')}
                autoComplete="email"
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                required
                name="phone"
                value={delivery.phone}
                onChange={field('phone')}
                autoComplete="tel"
              />
            </label>
            <label>
              Delivery province
              <select
                name="province"
                required
                value={delivery.province}
                onChange={field('province')}
              >
                <option value="" disabled>Choose province</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>

          <div className="form-section-head">
            <span className="page-eyebrow">Delivery address</span>
            <h3>Where are we delivering?</h3>
          </div>

          <label>
            Street address
            <input
              type="text"
              required
              name="addressLine1"
              value={delivery.addressLine1}
              onChange={field('addressLine1')}
              autoComplete="address-line1"
              placeholder="e.g. 12 Vineyard Lane"
            />
          </label>

          <label>
            Apartment, suite, or unit (optional)
            <input
              type="text"
              name="addressLine2"
              value={delivery.addressLine2}
              onChange={field('addressLine2')}
              autoComplete="address-line2"
              placeholder="e.g. Block B, Unit 4"
            />
          </label>

          <div className="form-grid two-columns">
            <label>
              Suburb
              <input
                type="text"
                required
                name="suburb"
                value={delivery.suburb}
                onChange={field('suburb')}
                autoComplete="address-level3"
              />
            </label>
            <label>
              City / Town
              <input
                type="text"
                required
                name="city"
                value={delivery.city}
                onChange={field('city')}
                autoComplete="address-level2"
              />
            </label>
            <label>
              Postal code
              <input
                type="text"
                required
                name="postalCode"
                value={delivery.postalCode}
                onChange={field('postalCode')}
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </label>
            <label>
              Country
              <input
                type="text"
                name="country"
                value={delivery.country}
                onChange={field('country')}
                autoComplete="country-name"
              />
            </label>
          </div>

          <label>
            Site notes (optional)
            <textarea
              name="siteNotes"
              rows="4"
              placeholder="Access restrictions, crane needs, timeline, utility setup, approvals."
              value={delivery.siteNotes}
              onChange={field('siteNotes')}
            />
          </label>

          <div className="project-actions">
            <Link to="/checkout" className="button-secondary">Back to Project Cart</Link>
            <button type="submit" className="button-primary">
              Continue to Payment
            </button>
          </div>
        </form>

        <aside className="summary-panel project-totals-panel">
          <span className="page-eyebrow">Project totals</span>
          <h2>Proposal summary</h2>
          <div className="summary-row summary-row-total">
            <span>Project Subtotal</span>
            <strong>{formatCurrency(projectSubtotal)}</strong>
          </div>
          <p className="field-note">
            {items.length} configured unit{items.length === 1 ? '' : 's'}. Edit configuration on the previous step.
          </p>
        </aside>
      </section>
    </AppShell>
  )
}
