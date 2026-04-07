// View layer: defines all top-level routes for the admin dashboard UI
import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { DashboardPage } from '../views/dashboard/DashboardPage'
import { ProductsListPage } from '../views/products/ProductsListPage'
import { ProductCreatePage } from '../views/products/ProductCreatePage'
import { OrdersListPage } from '../views/orders/OrdersListPage'
import { CustomersPage } from '../views/customers/CustomersPage'
import { LoginPage } from '../views/auth/LoginPage'
import { RequireAuth } from './RequireAuth.jsx'
import { GuestOnly } from './GuestOnly.jsx'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      <Route element={<GuestOnly />}>
        <Route path="/admin/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsListPage />} />
          <Route path="products/create" element={<ProductCreatePage />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="customers" element={<CustomersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  )
}

