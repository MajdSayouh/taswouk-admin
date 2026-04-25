// View layer: defines all top-level routes for the admin dashboard UI
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { DashboardPage } from '../views/dashboard/DashboardPage'
import { ProductsListPage } from '../views/products/ProductsListPage'
import { ProductCreatePage } from '../views/products/ProductCreatePage'
import { ProductEditPage } from '../views/products/ProductEditPage'
import { ProductDetailPage } from '../views/products/ProductDetailPage'
import { OrdersListPage } from '../views/orders/OrdersListPage'
import { CustomersPage } from '../views/customers/CustomersPage'
import { CategoriesListPage } from '../views/categories/CategoriesListPage.jsx'
import { StoresListPage } from '../views/stores/StoresListPage'
import { StoreCreatePage } from '../views/stores/StoreCreatePage'
import { StoreEditPage } from '../views/stores/StoreEditPage'
import { SellersHubPage } from '../views/sellers/SellersHubPage'
import { SellerCreatePage } from '../views/sellers/SellerCreatePage'
import { AdminProfilePage } from '../views/profile/AdminProfilePage.jsx'
import { LoginPage } from '../views/auth/LoginPage'
import { RequireAuth } from './RequireAuth.jsx'
import { RequireAdmin } from '../components/auth/RequireAdmin.jsx'
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
          <Route path="products/:id/edit" element={<ProductEditPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="categories" element={<CategoriesListPage />} />
          <Route path="stores" element={<StoresListPage />} />
          <Route path="stores/create" element={<StoreCreatePage />} />
          <Route path="stores/:id/edit" element={<StoreEditPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="sellers" element={<Outlet />}>
              <Route index element={<SellersHubPage />} />
              <Route path="create" element={<SellerCreatePage />} />
            </Route>
          </Route>
          <Route path="customers" element={<CustomersPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  )
}

