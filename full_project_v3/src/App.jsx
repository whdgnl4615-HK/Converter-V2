import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ConverterPage from './pages/ConverterPage'
import AdminPage from './pages/AdminPage'
import SyncPage from './pages/SyncPage'
import PDFConverterPage from './pages/PDFConverterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/sales-order" replace />} />
        <Route path="sales-order"    element={<ConverterPage module="sales_order" />} />
        <Route path="purchase-order" element={<ConverterPage module="purchase_order" />} />
        <Route path="style"          element={<ConverterPage module="style" />} />
        <Route path="customer"       element={<ConverterPage module="customer" />} />
        <Route path="inventory"      element={<ConverterPage module="inventory" />} />
        <Route path="sync"           element={<SyncPage />} />
        <Route path="pdf-converter"   element={<PDFConverterPage />} />
        <Route path="admin"          element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
