// View layout: responsible only for structuring the admin shell (sidebar, topbar, content).
// It does not own domain logic; that lives in ViewModels used by individual pages.
import { useEffect, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../components/layout/Sidebar'
import { MobileNav } from '../components/layout/MobileNav.jsx'
import { Topbar } from '../components/layout/Topbar'
import { useAuthStore } from '../store/authStore.js'
import { useDashboardFirebaseMessaging } from '../hooks/useDashboardFirebaseMessaging.js'

export function DashboardLayout() {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const { t } = useTranslation()

  useDashboardFirebaseMessaging(Boolean(token))

  useEffect(() => {
    if (token) fetchProfile()
  }, [token, fetchProfile])

  const currentTitle = useMemo(() => {
    const p = location.pathname
    if (p.match(/^\/sellers\/[^/]+\/edit$/)) return t('titles.editSeller')
    if (p.startsWith('/sellers/create')) return t('titles.createSeller')
    if (p.startsWith('/sellers')) return t('titles.sellers')
    if (p.startsWith('/stores/create')) return t('titles.createStore')
    if (p.match(/\/stores\/[^/]+\/edit$/)) return t('titles.editStore')
    if (p.startsWith('/stores')) return t('titles.stores')
    if (p.startsWith('/restaurants/create')) return t('titles.createRestaurant')
    if (p.match(/^\/restaurants\/[^/]+\/edit$/)) return t('titles.editRestaurant')
    if (p.startsWith('/restaurants')) return t('titles.restaurants')
    if (p.startsWith('/coupons/create')) return t('titles.createCoupon')
    if (p.match(/^\/coupons\/[^/]+\/edit$/)) return t('titles.editCoupon')
    if (p.startsWith('/coupons')) return t('titles.coupons')
    if (p.startsWith('/products/create')) return t('titles.createProduct')
    if (p.match(/\/products\/[^/]+\/edit$/)) return t('titles.editProduct')
    {
      const m = p.match(/^\/products\/([^/]+)$/)
      if (m && m[1] !== 'create') return t('titles.productDetails')
    }
    if (p.startsWith('/products')) return t('titles.products')
    if (p.startsWith('/categories')) return t('titles.categories')
    if (p.startsWith('/orders')) return t('titles.orders')
    if (p.startsWith('/drivers')) return t('titles.drivers')
    if (p.startsWith('/banners')) return t('titles.banners')
    if (p.startsWith('/points')) return t('titles.points')
    if (p.startsWith('/users')) return t('titles.adminUsers')
    if (p.startsWith('/notifications/broadcast')) return t('titles.notificationBroadcast')
    if (p.startsWith('/notifications/send')) return t('titles.notificationSend')
    if (p.startsWith('/notifications')) return t('titles.notifications')
    if (p.match(/^\/malls\/[^/]+\/edit$/)) return t('titles.editMall')
    if (p.startsWith('/malls/create')) return t('titles.createMall')
    if (p.startsWith('/malls')) return t('titles.malls')
    if (p.startsWith('/mall-categories')) return t('titles.mallCategories')
    if (p.match(/^\/mall-catalog\/[^/]+\/edit$/)) return t('titles.editMallCatalog')
    if (p.startsWith('/mall-catalog/create')) return t('titles.createMallCatalog')
    if (p.startsWith('/mall-catalog')) return t('titles.mallCatalog')
    if (p.match(/^\/external-shops\/[^/]+\/edit$/)) return t('titles.editExternalShop')
    if (p.startsWith('/external-shops/create')) return t('titles.createExternalShop')
    if (p.startsWith('/external-shops')) return t('titles.externalShops')
    if (p === '/' || p.startsWith('/home')) return t('titles.dashboard')
    if (p.startsWith('/profile')) return t('titles.profile')
    return t('titles.defaultApp')
  }, [location.pathname, t])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
          <MobileNav />
        </div>
        <div className="relative z-[100] shrink-0">
          <Topbar title={currentTitle} />
        </div>
        <main
          id="dashboard-scroll-container"
          className="relative z-0 flex-1 p-6 lg:p-8 bg-slate-50 overflow-y-auto min-h-0"
        >
          <div className="max-w-[110rem] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
