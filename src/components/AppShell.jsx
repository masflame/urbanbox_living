import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import '../commerce.css'

const preloadUnitsPage = () => import('../UnitsPage')
const preloadPlannerPage = () => import('../PlannerPage')
const preloadCartPage = () => import('../CartPage')

export default function AppShell({ children, accentLabel, heading, intro }) {
  const { itemCount } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const footerClickHistory = useRef([])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleFooterClick() {
    const now = Date.now()
    const history = footerClickHistory.current
    history.push(now)
    while (history.length && now - history[0] > 1500) {
      history.shift()
    }
    if (history.length >= 3) {
      footerClickHistory.current = []
      navigate('/admin')
    }
  }

  return (
    <div className="commerce-shell">
      <header className={scrolled ? 'site-header is-scrolled' : 'site-header'}>
        <NavLink to="/" className="site-brand" aria-label="Urban Box Living home">
          <img
            src="/portfolio/assets/logo.jpeg"
            alt="Urban Box Living"
            className="site-brand-logo"
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = '/portfolio/assets/logo.png'
            }}
          />
        </NavLink>

        <nav className="site-nav" aria-label="Primary">
          <ul className="shell-nav-links">
            <li><Link to="/#about">About</Link></li>
            <li><Link to="/#catalog">Catalog</Link></li>
            <li><NavLink to="/units" onMouseEnter={preloadUnitsPage} onFocus={preloadUnitsPage}>Units</NavLink></li>
            <li><NavLink to="/planner" onMouseEnter={preloadPlannerPage} onFocus={preloadPlannerPage}>Planner</NavLink></li>
            <li><Link to="/#features">Features</Link></li>
            <li><Link to="/#gallery">Gallery</Link></li>
            <li><Link to="/#contact">Contact</Link></li>
          </ul>

          <NavLink to="/cart" className="nav-cta" onMouseEnter={preloadCartPage} onFocus={preloadCartPage}>
            Cart
            <span className="cart-badge">{itemCount}</span>
          </NavLink>

          <button
            type="button"
            className={menuOpen ? 'site-menu-toggle is-open' : 'site-menu-toggle'}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>
      </header>

      <div className={menuOpen ? 'mobile-nav-panel is-open' : 'mobile-nav-panel'}>
        <Link to="/#about" onClick={closeMenu}>About</Link>
        <Link to="/#catalog" onClick={closeMenu}>Catalog</Link>
        <NavLink to="/units" onClick={closeMenu} onMouseEnter={preloadUnitsPage} onFocus={preloadUnitsPage}>Units</NavLink>
        <NavLink to="/planner" onClick={closeMenu} onMouseEnter={preloadPlannerPage} onFocus={preloadPlannerPage}>Planner</NavLink>
        <Link to="/#features" onClick={closeMenu}>Features</Link>
        <Link to="/#gallery" onClick={closeMenu}>Gallery</Link>
        <Link to="/#contact" onClick={closeMenu}>Contact</Link>
      </div>

      {(accentLabel || heading || intro) && (
        <section className="page-banner">
          {accentLabel ? <span className="page-eyebrow">{accentLabel}</span> : null}
          {heading ? <h1>{heading}</h1> : null}
          {intro ? <p>{intro}</p> : null}
        </section>
      )}

      <main>{children}</main>

      <footer className="site-footer">
        <div
          className="site-footer-copy"
          onClick={handleFooterClick}
          role="presentation"
        >
          © {new Date().getFullYear()} Urban Box Living. All rights reserved. Cape Town, South Africa.
        </div>
      </footer>
    </div>
  )
}