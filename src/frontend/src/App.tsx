import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/useAuth'
import { Layout } from '@/components/layout/Layout'
import { RankingsPage } from '@/pages/RankingsPage'
import { StockDetailPage } from '@/pages/StockDetailPage'
import { BacktestPage } from '@/pages/BacktestPage'
import { AdminPage } from '@/pages/AdminPage'
import { LoginPage } from '@/pages/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<RankingsPage />} />
              <Route path="/rankings/:ticker" element={<StockDetailPage />} />
              <Route path="/backtest" element={<BacktestPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
