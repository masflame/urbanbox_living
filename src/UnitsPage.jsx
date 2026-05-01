import { startTransition, useDeferredValue, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppShell from './components/AppShell'
import CustomSelect from './components/CustomSelect'
import { allUnits, unitCategories, unitSizeBuckets, unitTiers } from './data/unitsCatalog'
import { useCart } from './context/CartContext'

const tierOptions = [
  { value: '', label: 'All tiers' },
  ...unitTiers.map((tier) => ({
    value: tier,
    label: tier === 'Basic' ? 'Basic (Container)' : 'Premium (High-end)',
  })),
]
const categoryOptions = [
  { value: '', label: 'All categories' },
  ...unitCategories.map((c) => ({ value: c, label: c })),
]
const sizeOptions = [
  { value: '', label: 'All sizes' },
  ...unitSizeBuckets.map((b) => ({ value: b, label: b })),
]
const priceOptions = [
  { value: '', label: 'All prices' },
  { value: 'under-100k', label: 'Under R100k' },
  { value: '100k-250k', label: 'R100k to R250k' },
  { value: '250k-500k', label: 'R250k to R500k' },
  { value: 'over-500k', label: 'Over R500k' },
]
const sortOptions = [
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'name', label: 'Name' },
]

function filterUnits(units, filters) {
  const deferredQuery = filters.query.trim().toLowerCase()

  return units
    .filter((unit) => !filters.tier || unit.tier === filters.tier)
    .filter((unit) => !filters.category || unit.category === filters.category)
    .filter((unit) => !filters.collection || unit.collectionLabel === filters.collection)
    .filter((unit) => !filters.sizeBucket || unit.size.bucket === filters.sizeBucket)
    .filter((unit) => {
      if (!filters.priceRange) return true
      if (unit.price.amountZar == null) return false
      if (filters.priceRange === 'under-100k') return unit.price.amountZar < 100000
      if (filters.priceRange === '100k-250k') return unit.price.amountZar >= 100000 && unit.price.amountZar <= 250000
      if (filters.priceRange === '250k-500k') return unit.price.amountZar > 250000 && unit.price.amountZar <= 500000
      if (filters.priceRange === 'over-500k') return unit.price.amountZar > 500000
      return true
    })
    .filter((unit) => !deferredQuery || unit.searchText.includes(deferredQuery))
    .sort((left, right) => {
      if (filters.sort === 'price-high') {
        return (right.price.amountZar ?? -1) - (left.price.amountZar ?? -1)
      }
      if (filters.sort === 'name') {
        return left.name.localeCompare(right.name)
      }
      return (left.price.amountZar ?? Number.MAX_SAFE_INTEGER) - (right.price.amountZar ?? Number.MAX_SAFE_INTEGER)
    })
}

export default function UnitsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { addItem } = useCart()
  const desktopFiltersPrefix = 'desktop'

  const filters = {
    query: searchParams.get('q') ?? '',
    tier: searchParams.get('tier') ?? '',
    category: searchParams.get('category') ?? '',
    collection: searchParams.get('collection') ?? '',
    sizeBucket: searchParams.get('size') ?? '',
    priceRange: searchParams.get('price') ?? '',
    sort: searchParams.get('sort') ?? 'price-low',
  }

  const deferredQuery = useDeferredValue(filters.query)
  const filteredUnits = filterUnits(allUnits, { ...filters, query: deferredQuery })

  function updateFilter(key, value) {
    const nextParams = new URLSearchParams(searchParams)
    if (value) nextParams.set(key, value)
    else nextParams.delete(key)

    startTransition(() => {
      setSearchParams(nextParams)
    })
  }

  return (
    <AppShell
      accentLabel="Units Catalog"
      heading="Ready-Made Units"
      intro="Filter by category, size, collection and price. Tap any unit to preview the gallery and add to cart."
    >
      <section className="content-section compact-top">
        <div className="units-toolbar">
          <div className="units-toolbar-count">
            <strong>{filteredUnits.length}</strong>
            <span>{filteredUnits.length === 1 ? 'unit matches' : 'units match'}</span>
          </div>

          <div className="filters-panel filters-panel-inline">
            <div className="filter-field filter-search">
              <label htmlFor={`${desktopFiltersPrefix}-unit-search`}>Search</label>
              <input
                id={`${desktopFiltersPrefix}-unit-search`}
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter('q', event.target.value)}
                placeholder="Search by name, category or feature"
              />
            </div>

            <div className="filter-field">
              <label htmlFor={`${desktopFiltersPrefix}-unit-tier`}>Tier</label>
              <CustomSelect
                id={`${desktopFiltersPrefix}-unit-tier`}
                ariaLabel="Filter by tier"
                value={filters.tier}
                onChange={(v) => updateFilter('tier', v)}
                options={tierOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor={`${desktopFiltersPrefix}-unit-category`}>Category</label>
              <CustomSelect
                id={`${desktopFiltersPrefix}-unit-category`}
                ariaLabel="Filter by category"
                value={filters.category}
                onChange={(v) => updateFilter('category', v)}
                options={categoryOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor={`${desktopFiltersPrefix}-unit-size`}>Size</label>
              <CustomSelect
                id={`${desktopFiltersPrefix}-unit-size`}
                ariaLabel="Filter by size"
                value={filters.sizeBucket}
                onChange={(v) => updateFilter('size', v)}
                options={sizeOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor={`${desktopFiltersPrefix}-unit-price`}>Price</label>
              <CustomSelect
                id={`${desktopFiltersPrefix}-unit-price`}
                ariaLabel="Filter by price"
                value={filters.priceRange}
                onChange={(v) => updateFilter('price', v)}
                options={priceOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor={`${desktopFiltersPrefix}-unit-sort`}>Sort</label>
              <CustomSelect
                id={`${desktopFiltersPrefix}-unit-sort`}
                ariaLabel="Sort units"
                value={filters.sort}
                onChange={(v) => updateFilter('sort', v)}
                options={sortOptions}
              />
            </div>
          </div>

          <div className="units-toolbar-actions">
            <button type="button" className="button-primary button-small" onClick={() => setFiltersOpen(true)}>
              <span aria-hidden="true" className="toolbar-icon">≡</span>
              Filters
            </button>
            <button type="button" className="text-button" onClick={() => setSearchParams(new URLSearchParams({ sort: 'price-low' }))}>
              Reset
            </button>
          </div>
        </div>

        <div className={filtersOpen ? 'filters-drawer-backdrop is-open' : 'filters-drawer-backdrop'} onClick={() => setFiltersOpen(false)} />
        <aside className={filtersOpen ? 'filters-drawer is-open' : 'filters-drawer'} aria-hidden={!filtersOpen}>
          <div className="filters-drawer-head">
            <h3>Filters</h3>
            <button type="button" className="text-button" onClick={() => setFiltersOpen(false)}>
              Close
            </button>
          </div>

          <div className="filters-panel">
            <div className="filter-field filter-search">
              <label htmlFor="unit-search">Search</label>
              <input
                id="unit-search"
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter('q', event.target.value)}
                placeholder="Search by name, category or feature"
              />
            </div>

            <div className="filter-field">
              <label htmlFor="unit-tier">Tier</label>
              <CustomSelect
                id="unit-tier"
                ariaLabel="Filter by tier"
                value={filters.tier}
                onChange={(v) => updateFilter('tier', v)}
                options={tierOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="unit-category">Category</label>
              <CustomSelect
                id="unit-category"
                ariaLabel="Filter by category"
                value={filters.category}
                onChange={(v) => updateFilter('category', v)}
                options={categoryOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="unit-size">Size</label>
              <CustomSelect
                id="unit-size"
                ariaLabel="Filter by size"
                value={filters.sizeBucket}
                onChange={(v) => updateFilter('size', v)}
                options={sizeOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="unit-price">Price</label>
              <CustomSelect
                id="unit-price"
                ariaLabel="Filter by price"
                value={filters.priceRange}
                onChange={(v) => updateFilter('price', v)}
                options={priceOptions}
              />
            </div>

            <div className="filter-field">
              <label htmlFor="unit-sort">Sort</label>
              <CustomSelect
                id="unit-sort"
                ariaLabel="Sort units"
                value={filters.sort}
                onChange={(v) => updateFilter('sort', v)}
                options={sortOptions}
              />
            </div>
          </div>
        </aside>

        <div className="unit-grid unit-grid-five catalog-grid-spacing">
          {filteredUnits.map((unit) => (
            <article key={unit.id} className="unit-card">
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
                <p className="unit-card-desc">{unit.shortDescription}</p>
                <div className="unit-card-specs">
                  <span>{unit.collectionLabel}</span>
                  <span>{unit.leadTime}</span>
                </div>
                <div className="unit-card-footer unit-card-footer-stacked">
                  <strong>{unit.price.display}</strong>
                  <div className="unit-card-actions">
                    <Link to={`/units/${unit.slug}`} className="button-secondary button-small">
                      Preview
                    </Link>
                    <button type="button" className="button-primary button-small" onClick={() => addItem(unit, 1)}>
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}