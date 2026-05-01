import { Link } from 'react-router-dom'
import AppShell from './components/AppShell'
import { allUnits, getFeaturedUnits, getUnitsByCategory, unitCategories } from './data/unitsCatalog'

function UnitCard({ unit }) {
  return (
    <article className="unit-card">
      <Link to={`/units/${unit.slug}`} className="unit-card-media">
        {unit.coverImage ? <img src={unit.coverImage} alt={unit.name} /> : null}
      </Link>
      <div className="unit-card-body">
        <div className="unit-card-meta">
          <span>{unit.category}</span>
          <span>{unit.size.sizeLabel}</span>
        </div>
        <h3>
          <Link to={`/units/${unit.slug}`}>{unit.name}</Link>
        </h3>
        <p>{unit.shortDescription}</p>
        <div className="unit-card-footer">
          <strong>{unit.price.display}</strong>
          <Link to={`/units/${unit.slug}`} className="text-link">
            View unit
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function HomePage() {
  const featuredUnits = getFeaturedUnits(5)
  const fastMovingUnits = allUnits.slice(5, 10)
  const spotlightCategories = unitCategories.slice(0, 4).map((category) => ({
    category,
    units: getUnitsByCategory(category, 2),
  }))

  return (
    <AppShell>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="page-eyebrow">Ready-made stock</span>
          <h1>
            Container spaces with real inventory,
            <span> priced for purchase and ready to move.</span>
          </h1>
          <p>
            Browse ready-made homes, pools, offices, guard booths and specialty units in one place.
            Filter by category, size and price, add units to cart, and run a mock checkout flow before
            final enquiry handoff.
          </p>
          <div className="hero-actions">
            <Link to="/units" className="button-primary">
              Browse Units
            </Link>
            <Link to="/planner" className="button-secondary">
              Start Custom Build
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="metric-card">
            <strong>{allUnits.length}</strong>
            <span>ready-made listings now live</span>
          </div>
          <div className="metric-card">
            <strong>{unitCategories.length}</strong>
            <span>unit categories to filter through</span>
          </div>
          <div className="metric-card">
            <strong>5-up</strong>
            <span>catalog rows on desktop for fast scanning</span>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading-row">
          <div>
            <span className="page-eyebrow">Featured Units</span>
            <h2>Ready for purchase right now</h2>
          </div>
          <Link to="/units" className="text-link">
            See the full units page
          </Link>
        </div>

        <div className="unit-grid unit-grid-five">
          {featuredUnits.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      </section>

      <section className="content-section split-section">
        <div className="split-copy">
          <span className="page-eyebrow">Home Page CTA</span>
          <h2>Pick stock now, then customise the delivery conversation.</h2>
          <p>
            The new units flow is built for real buying behaviour: shortlist inventory, compare sizes,
            review galleries, add to cart, then submit a mock checkout request so the sales team has
            a structured brief to follow up on.
          </p>
          <Link to="/units" className="button-primary">
            Open Units Catalog
          </Link>
        </div>

        <div className="spotlight-grid">
          {spotlightCategories.map(({ category, units }) => (
            <Link key={category} to={`/units?category=${encodeURIComponent(category)}`} className="spotlight-card">
              <span>{category}</span>
              <strong>{units.length ? units[0].name : `${category} collection`}</strong>
              <p>
                {allUnits.filter((unit) => unit.category === category).length} listing
                {allUnits.filter((unit) => unit.category === category).length === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading-row">
          <div>
            <span className="page-eyebrow">More Stock</span>
            <h2>Units woven throughout the homepage</h2>
          </div>
          <p className="section-support">
            This block keeps ready-made stock visible on the home page instead of hiding everything
            behind a single catalog entry point.
          </p>
        </div>

        <div className="unit-grid unit-grid-five">
          {fastMovingUnits.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      </section>

      <section className="content-section footer-cta" id="contact">
        <span className="page-eyebrow">Next Step</span>
        <h2>Need a bespoke layout instead of stock?</h2>
        <p>
          Use the planner for custom work, or send the mock cart through checkout to show which
          ready-made units you want to secure first.
        </p>
        <div className="hero-actions">
          <Link to="/planner" className="button-secondary">
            Open Planner
          </Link>
          <Link to="/cart" className="button-primary">
            Review Cart
          </Link>
        </div>
      </section>
    </AppShell>
  )
}