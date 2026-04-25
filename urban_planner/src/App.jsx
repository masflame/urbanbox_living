import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PlannerPage from './PlannerPage'
import PortfolioPage from './PortfolioPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
