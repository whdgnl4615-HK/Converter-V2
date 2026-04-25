import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import AuthPage from './pages/AuthPage'
import PendingPage from './pages/PendingPage'
import ConverterPage from './pages/ConverterPage'
import AdminPage from './pages/AdminPage'
import SyncPage from './pages/SyncPage'
import PDFConverterPage from './pages/PDFConverterPage'

function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role === 'pending') return <Navigate to="/pending" replace />
  if (profile?.role === 'rejected') return <Navigate to="/login" replace />
  // profile null이어도 user 있으면 일단 통과 (profile 로딩 실패 대비)
  return children
}

function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
    </div>
  )
  if (user) return <Navigate to="/" replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"   element={<RedirectIfAuth><AuthPage /></RedirectIfAuth>} />
      <Route path="/pending" element={<PendingPage />} />

      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/sales-order" replace />} />
        <Route path="sales-order"    element={<ConverterPage module="sales_order" />} />
        <Route path="purchase-order" element={<ConverterPage module="purchase_order" />} />
        <Route path="style"          element={<ConverterPage module="style" />} />
        <Route path="customer"       element={<ConverterPage module="customer" />} />
        <Route path="inventory"      element={<ConverterPage module="inventory" />} />
        <Route path="sync"           element={<SyncPage />} />
        <Route path="pdf-converter"  element={<PDFConverterPage />} />
        <Route path="admin"          element={<RequireAdmin><AdminPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
