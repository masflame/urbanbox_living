import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import PlannerPage from './PlannerPage'
import PortfolioPage from './PortfolioPage'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
