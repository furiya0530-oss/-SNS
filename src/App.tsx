import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { isDemoMode } from '@/lib/demo'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardPage } from '@/pages/DashboardPage'
import { ItemsPage } from '@/pages/ItemsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PropertiesPage } from '@/pages/PropertiesPage'

// デモビルドは SPA フォールバックの無い静的ホストに置くため、
// パスではなくハッシュでルーティングする。
const Router = isDemoMode ? HashRouter : BrowserRouter

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
