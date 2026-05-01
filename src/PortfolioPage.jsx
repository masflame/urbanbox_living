import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import './PortfolioPage.css'

export default function PortfolioPage() {
  const { search, hash } = useLocation()
  const iframeSrc = `/portfolio/index.html${search}${hash}`
  const iframeRef = useRef(null)

  // When hash changes on an already-loaded iframe, post a message to scroll
  useEffect(() => {
    if (!hash) return
    const iframe = iframeRef.current
    if (!iframe) return
    const handleLoad = () => {
      iframe.contentWindow?.postMessage({ scrollTo: hash.replace('#', '') }, '*')
    }
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [hash, iframeSrc])

  return (
    <div className="portfolio-shell">
      <iframe
        ref={iframeRef}
        title="Urban Box Living Portfolio"
        src={iframeSrc}
        className="portfolio-frame"
      />
    </div>
  )
}
