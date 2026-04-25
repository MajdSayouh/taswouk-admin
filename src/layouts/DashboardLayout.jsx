// View layout: responsible only for structuring the admin shell (sidebar, topbar, content).
// It does not own domain logic; that lives in ViewModels used by individual pages.
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { MobileNav } from '../components/layout/MobileNav.jsx'
import { Topbar } from '../components/layout/Topbar'
import { useAuthStore } from '../store/authStore.js'

export function DashboardLayout() {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  useEffect(() => {
    if (token) fetchProfile()
  }, [token, fetchProfile])

  const currentTitle = (() => {
    if (location.pathname.startsWith('/admin/sellers/create')) return 'Create seller'
    if (location.pathname === '/admin/sellers') return 'Sellers'
    if (location.pathname.startsWith('/admin/stores/create')) return 'Create Store'
    if (location.pathname.match(/\/admin\/stores\/[^/]+\/edit$/)) return 'Edit Store'
    if (location.pathname.startsWith('/admin/stores')) return 'Stores'
    if (location.pathname.startsWith('/admin/products/create')) return 'Create Product'
    if (location.pathname.match(/\/admin\/products\/[^/]+\/edit$/)) return 'Edit Product'
    {
      const m = location.pathname.match(/^\/admin\/products\/([^/]+)$/)
      if (m && m[1] !== 'create') return 'Product details'
    }
    if (location.pathname.startsWith('/admin/products')) return 'Products'
    if (location.pathname.startsWith('/admin/categories')) return 'Categories'
    if (location.pathname.startsWith('/admin/orders')) return 'Orders'
    if (location.pathname.startsWith('/admin/customers')) return 'Customers'
    if (location.pathname.startsWith('/admin/dashboard')) return 'Dashboard'
    if (location.pathname.startsWith('/admin/profile')) return 'Profile'
    return 'Jomran Admin'
  })()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
          <MobileNav />
        </div>
        <Topbar title={currentTitle} />
        <main className="flex-1 p-6 lg:p-8 bg-slate-50 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

