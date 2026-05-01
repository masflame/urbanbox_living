import { useLocation } from 'react-router-dom'
import './PortfolioPage.css'

export default function AdminDashboardPage() {
  const { search, hash } = useLocation()
  const iframeSrc = `/portfolio/enquiries-dashboard.html${search}${hash}`

  return (
    <div className="portfolio-shell">
      <iframe
        title="Urban Box Living Admin Dashboard"
        src={iframeSrc}
        className="portfolio-frame"
      />
    </div>
  )
}
