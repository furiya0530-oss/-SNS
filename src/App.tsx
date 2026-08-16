import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { isDemoMode } from '@/lib/demo'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardPage } from '@/pages/DashboardPage'
import { ItemsPage } from '@/pages/ItemsPage'
import { CsvPage } from '@/pages/CsvPage'
import { PlanPage } from '@/pages/PlanPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PropertiesPage } from '@/pages/PropertiesPage'
import { PropertyDetailPage } from '@/pages/PropertyDetailPage'
import { ChecklistEditPage } from '@/pages/ChecklistEditPage'
import { ChecklistRunPage } from '@/pages/ChecklistRunPage'
import { ChecklistRecordsPage } from '@/pages/ChecklistRecordsPage'
import { ChecklistRecordDetailPage } from '@/pages/ChecklistRecordDetailPage'

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
          <Route
            path="/properties/:propertyId"
            element={<PropertyDetailPage />}
          />
          <Route
            path="/properties/:propertyId/checklists/:checklistId"
            element={<ChecklistEditPage />}
          />
          <Route
            path="/properties/:propertyId/checklists/:checklistId/run"
            element={<ChecklistRunPage />}
          />
          <Route
            path="/properties/:propertyId/records"
            element={<ChecklistRecordsPage />}
          />
          <Route
            path="/properties/:propertyId/records/:recordId"
            element={<ChecklistRecordDetailPage />}
          />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/csv" element={<CsvPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
