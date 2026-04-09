import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import PendingPage from './pages/PendingPage'
import Layout from './components/layout/Layout'
import ConverterPage from './pages/ConverterPage'
import AdminPage from './pages/AdminPage'
import SyncPage from './pages/SyncPage'

function RequireAuth({ children }) {
  const { user, loading, isActive, isPending } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen" style={{color:'var(--text2)'}}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (isPending) return <Navigate to="/pending" replace />
  if (!isActive) return <Navigate to="/pending" replace />
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, loading, isPending } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{color:'var(--text2)'}}>
      Loading…
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={!user ? <AuthPage /> : isPending ? <Navigate to="/pending" /> : <Navigate to="/" />} />
      <Route path="/pending" element={<PendingPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/sales-order" replace />} />
        <Route path="sales-order"    element={<ConverterPage module="sales_order" />} />
        <Route path="purchase-order" element={<ConverterPage module="purchase_order" />} />
        <Route path="style"          element={<ConverterPage module="style" />} />
        <Route path="customer"       element={<ConverterPage module="customer" />} />
        <Route path="inventory"      element={<ConverterPage module="inventory" />} />
        <Route path="sync"           element={<SyncPage />} />
        <Route path="admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
      </Route>
    </Routes>
  )
}
