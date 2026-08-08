// View layer: defines all top-level routes for the admin dashboard UI
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { LoginPage } from '../views/auth/LoginPage'
import { RequireAuth } from './RequireAuth.jsx'
import { RequireAdmin } from '../components/auth/RequireAdmin.jsx'
import { GuestOnly } from './GuestOnly.jsx'
import { PageLoader } from '../components/ui/PageLoader.jsx'

const DashboardPage = lazy(() =>
  import('../views/dashboard/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage })),
)
const ProductsListPage = lazy(() =>
  import('../views/products/ProductsListPage.jsx').then((m) => ({ default: m.ProductsListPage })),
)
const ProductCreatePage = lazy(() =>
  import('../views/products/ProductCreatePage.jsx').then((m) => ({ default: m.ProductCreatePage })),
)
const ProductEditPage = lazy(() =>
  import('../views/products/ProductEditPage.jsx').then((m) => ({ default: m.ProductEditPage })),
)
const ProductDetailPage = lazy(() =>
  import('../views/products/ProductDetailPage.jsx').then((m) => ({ default: m.ProductDetailPage })),
)
const OrdersListPage = lazy(() =>
  import('../views/orders/OrdersListPage.jsx').then((m) => ({ default: m.OrdersListPage })),
)
const DriversListPage = lazy(() =>
  import('../views/drivers/DriversListPage.jsx').then((m) => ({ default: m.DriversListPage })),
)
const CategoriesListPage = lazy(() =>
  import('../views/categories/CategoriesListPage.jsx').then((m) => ({
    default: m.CategoriesListPage,
  })),
)
const StoresListPage = lazy(() =>
  import('../views/stores/StoresListPage.jsx').then((m) => ({ default: m.StoresListPage })),
)
const CouponsListPage = lazy(() =>
  import('../views/coupons/CouponsListPage.jsx').then((m) => ({ default: m.CouponsListPage })),
)
const CouponCreatePage = lazy(() =>
  import('../views/coupons/CouponCreatePage.jsx').then((m) => ({ default: m.CouponCreatePage })),
)
const CouponEditPage = lazy(() =>
  import('../views/coupons/CouponEditPage.jsx').then((m) => ({ default: m.CouponEditPage })),
)
const ProgressiveCouponsListPage = lazy(() =>
  import('../views/progressiveCoupons/ProgressiveCouponsListPage.jsx').then((m) => ({
    default: m.ProgressiveCouponsListPage,
  })),
)
const ProgressiveCouponCreatePage = lazy(() =>
  import('../views/progressiveCoupons/ProgressiveCouponCreatePage.jsx').then((m) => ({
    default: m.ProgressiveCouponCreatePage,
  })),
)
const StoreCreatePage = lazy(() =>
  import('../views/stores/StoreCreatePage.jsx').then((m) => ({ default: m.StoreCreatePage })),
)
const StoreEditPage = lazy(() =>
  import('../views/stores/StoreEditPage.jsx').then((m) => ({ default: m.StoreEditPage })),
)
const SellersListPage = lazy(() =>
  import('../views/sellers/SellersListPage.jsx').then((m) => ({ default: m.SellersListPage })),
)
const SellerCreatePage = lazy(() =>
  import('../views/sellers/SellerCreatePage.jsx').then((m) => ({ default: m.SellerCreatePage })),
)
const SellerEditPage = lazy(() =>
  import('../views/sellers/SellerEditPage.jsx').then((m) => ({ default: m.SellerEditPage })),
)
const MallsListPage = lazy(() =>
  import('../views/malls/MallsListPage.jsx').then((m) => ({ default: m.MallsListPage })),
)
const MallCreatePage = lazy(() =>
  import('../views/malls/MallCreatePage.jsx').then((m) => ({ default: m.MallCreatePage })),
)
const MallEditPage = lazy(() =>
  import('../views/malls/MallEditPage.jsx').then((m) => ({ default: m.MallEditPage })),
)
const ExternalShopsListPage = lazy(() =>
  import('../views/external-shops/ExternalShopsListPage.jsx').then((m) => ({
    default: m.ExternalShopsListPage,
  })),
)
const ExternalShopCreatePage = lazy(() =>
  import('../views/external-shops/ExternalShopCreatePage.jsx').then((m) => ({
    default: m.ExternalShopCreatePage,
  })),
)
const ExternalShopEditPage = lazy(() =>
  import('../views/external-shops/ExternalShopEditPage.jsx').then((m) => ({
    default: m.ExternalShopEditPage,
  })),
)
const MallCategoriesListPage = lazy(() =>
  import('../views/mall-categories/MallCategoriesListPage.jsx').then((m) => ({
    default: m.MallCategoriesListPage,
  })),
)
const MallCatalogListPage = lazy(() =>
  import('../views/mall-catalog/MallCatalogListPage.jsx').then((m) => ({
    default: m.MallCatalogListPage,
  })),
)
const MallCatalogCreatePage = lazy(() =>
  import('../views/mall-catalog/MallCatalogCreatePage.jsx').then((m) => ({
    default: m.MallCatalogCreatePage,
  })),
)
const MallCatalogEditPage = lazy(() =>
  import('../views/mall-catalog/MallCatalogEditPage.jsx').then((m) => ({
    default: m.MallCatalogEditPage,
  })),
)
const AdminProfilePage = lazy(() =>
  import('../views/profile/AdminProfilePage.jsx').then((m) => ({ default: m.AdminProfilePage })),
)
const BannersListPage = lazy(() =>
  import('../views/banners/BannersListPage.jsx').then((m) => ({ default: m.BannersListPage })),
)
const PointsSettingsPage = lazy(() =>
  import('../views/points/PointsSettingsPage.jsx').then((m) => ({ default: m.PointsSettingsPage })),
)
const ExchangeRateSettingsPage = lazy(() =>
  import('../views/exchange-rate/ExchangeRateSettingsPage.jsx').then((m) => ({
    default: m.ExchangeRateSettingsPage,
  })),
)
const AdminUsersPage = lazy(() =>
  import('../views/users/AdminUsersPage.jsx').then((m) => ({ default: m.AdminUsersPage })),
)
const NotificationsIndexPage = lazy(() =>
  import('../views/notifications/NotificationsIndexPage.jsx').then((m) => ({
    default: m.NotificationsIndexPage,
  })),
)
const NotificationBroadcastPage = lazy(() =>
  import('../views/notifications/NotificationBroadcastPage.jsx').then((m) => ({
    default: m.NotificationBroadcastPage,
  })),
)
const NotificationSendPage = lazy(() =>
  import('../views/notifications/NotificationSendPage.jsx').then((m) => ({
    default: m.NotificationSendPage,
  })),
)

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />

      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route
            path="home"
            element={
              <LazyPage>
                <DashboardPage />
              </LazyPage>
            }
          />
          <Route
            path="products"
            element={
              <LazyPage>
                <ProductsListPage />
              </LazyPage>
            }
          />
          <Route
            path="products/create"
            element={
              <LazyPage>
                <ProductCreatePage />
              </LazyPage>
            }
          />
          <Route
            path="products/:id/edit"
            element={
              <LazyPage>
                <ProductEditPage />
              </LazyPage>
            }
          />
          <Route
            path="products/:id"
            element={
              <LazyPage>
                <ProductDetailPage />
              </LazyPage>
            }
          />
          <Route
            path="orders"
            element={
              <LazyPage>
                <OrdersListPage />
              </LazyPage>
            }
          />
          <Route
            path="drivers"
            element={
              <LazyPage>
                <DriversListPage />
              </LazyPage>
            }
          />
          <Route
            path="categories"
            element={
              <LazyPage>
                <CategoriesListPage />
              </LazyPage>
            }
          />
          <Route
            path="stores"
            element={
              <LazyPage>
                <StoresListPage />
              </LazyPage>
            }
          />
          <Route
            path="stores/create"
            element={
              <LazyPage>
                <StoreCreatePage />
              </LazyPage>
            }
          />
          <Route
            path="stores/:id/edit"
            element={
              <LazyPage>
                <StoreEditPage />
              </LazyPage>
            }
          />
          <Route
            path="coupons"
            element={
              <LazyPage>
                <CouponsListPage />
              </LazyPage>
            }
          />
          <Route
            path="coupons/create"
            element={
              <LazyPage>
                <CouponCreatePage />
              </LazyPage>
            }
          />
          <Route
            path="coupons/:id/edit"
            element={
              <LazyPage>
                <CouponEditPage />
              </LazyPage>
            }
          />
          <Route element={<RequireAdmin />}>
            <Route
              path="progressive-coupons"
              element={
                <LazyPage>
                  <ProgressiveCouponsListPage />
                </LazyPage>
              }
            />
            <Route
              path="progressive-coupons/create"
              element={
                <LazyPage>
                  <ProgressiveCouponCreatePage />
                </LazyPage>
              }
            />
            <Route
              path="banners"
              element={
                <LazyPage>
                  <BannersListPage />
                </LazyPage>
              }
            />
            <Route
              path="points"
              element={
                <LazyPage>
                  <PointsSettingsPage />
                </LazyPage>
              }
            />
            <Route
              path="exchange-rate"
              element={
                <LazyPage>
                  <ExchangeRateSettingsPage />
                </LazyPage>
              }
            />
            <Route path="users" element={<Outlet />}>
              <Route index element={<Navigate to="customers" replace />} />
              <Route
                path="customers"
                element={
                  <LazyPage>
                    <AdminUsersPage role="CUSTOMER" />
                  </LazyPage>
                }
              />
              <Route
                path="sellers"
                element={
                  <LazyPage>
                    <AdminUsersPage role="SELLER" />
                  </LazyPage>
                }
              />
              <Route
                path="delivery"
                element={
                  <LazyPage>
                    <AdminUsersPage role="DELIVERY" />
                  </LazyPage>
                }
              />
              <Route
                path="admins"
                element={
                  <LazyPage>
                    <AdminUsersPage role="ADMIN" />
                  </LazyPage>
                }
              />
            </Route>
            <Route path="notifications" element={<Outlet />}>
              <Route
                index
                element={
                  <LazyPage>
                    <NotificationsIndexPage />
                  </LazyPage>
                }
              />
              <Route
                path="broadcast"
                element={
                  <LazyPage>
                    <NotificationBroadcastPage />
                  </LazyPage>
                }
              />
              <Route
                path="send"
                element={
                  <LazyPage>
                    <NotificationSendPage />
                  </LazyPage>
                }
              />
            </Route>
            <Route path="sellers" element={<Outlet />}>
              <Route
                index
                element={
                  <LazyPage>
                    <SellersListPage />
                  </LazyPage>
                }
              />
              <Route
                path="create"
                element={
                  <LazyPage>
                    <SellerCreatePage />
                  </LazyPage>
                }
              />
              <Route
                path=":id/edit"
                element={
                  <LazyPage>
                    <SellerEditPage />
                  </LazyPage>
                }
              />
            </Route>
            <Route path="malls" element={<Outlet />}>
              <Route
                index
                element={
                  <LazyPage>
                    <MallsListPage />
                  </LazyPage>
                }
              />
              <Route
                path="create"
                element={
                  <LazyPage>
                    <MallCreatePage />
                  </LazyPage>
                }
              />
              <Route
                path=":id/edit"
                element={
                  <LazyPage>
                    <MallEditPage />
                  </LazyPage>
                }
              />
            </Route>
            <Route
              path="mall-categories"
              element={
                <LazyPage>
                  <MallCategoriesListPage />
                </LazyPage>
              }
            />
            <Route path="mall-catalog" element={<Outlet />}>
              <Route
                index
                element={
                  <LazyPage>
                    <MallCatalogListPage />
                  </LazyPage>
                }
              />
              <Route
                path="create"
                element={
                  <LazyPage>
                    <MallCatalogCreatePage />
                  </LazyPage>
                }
              />
              <Route
                path=":id/edit"
                element={
                  <LazyPage>
                    <MallCatalogEditPage />
                  </LazyPage>
                }
              />
            </Route>
            <Route path="external-shops" element={<Outlet />}>
              <Route
                index
                element={
                  <LazyPage>
                    <ExternalShopsListPage />
                  </LazyPage>
                }
              />
              <Route
                path="create"
                element={
                  <LazyPage>
                    <ExternalShopCreatePage />
                  </LazyPage>
                }
              />
              <Route
                path=":id/edit"
                element={
                  <LazyPage>
                    <ExternalShopEditPage />
                  </LazyPage>
                }
              />
            </Route>
          </Route>
          <Route
            path="profile"
            element={
              <LazyPage>
                <AdminProfilePage />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
