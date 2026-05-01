import { Link } from 'react-router-dom'
import AppShell from './components/AppShell'
import QuantityStepper from './components/QuantityStepper'
import { useCart } from './context/CartContext'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart()

  return (
    <AppShell
      accentLabel="Cart"
      heading="Review selected units"
      intro="This cart is local to the browser and feeds the mock checkout request."
    >
      <section className="content-section cart-layout compact-top">
        <div className="cart-list">
          {items.length === 0 ? (
            <div className="empty-state">
              <h2>Your cart is empty.</h2>
              <p>Add units from the catalog to continue to mock checkout.</p>
              <Link to="/units" className="button-primary">
                Browse units
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="cart-item">
                <Link to={`/units/${item.slug}`} className="cart-item-media">
                  {item.coverImage ? <img src={item.coverImage} alt={item.name} /> : null}
                </Link>
                <div className="cart-item-copy">
                  <span className="page-eyebrow">{item.category}</span>
                  <h2>
                    <Link to={`/units/${item.slug}`}>{item.name}</Link>
                  </h2>
                  <p>{item.collectionLabel} · {item.size.sizeLabel}</p>
                </div>
                <div className="cart-item-controls">
                  <label htmlFor={`qty-${item.id}`}>Qty</label>
                  <QuantityStepper
                    id={`qty-${item.id}`}
                    value={item.quantity}
                    onChange={(n) => updateQuantity(item.id, n)}
                    min={1}
                    max={99}
                  />
                </div>
                <div className="cart-item-actions">
                  <strong>{item.price.display}</strong>
                  <button type="button" className="text-button" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="summary-panel">
          <span className="page-eyebrow">Summary</span>
          <h2>Mock order total</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Quoted after checkout</strong>
          </div>
          <div className="summary-row summary-row-total">
            <span>Total</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <Link to="/checkout" className="button-primary">
            Continue to mock checkout
          </Link>
        </aside>
      </section>
    </AppShell>
  )
}