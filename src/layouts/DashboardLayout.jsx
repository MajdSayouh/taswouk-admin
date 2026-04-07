// View layout: responsible only for structuring the admin shell (sidebar, topbar, content).
// It does not own domain logic; that lives in ViewModels used by individual pages.
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'

export function DashboardLayout() {
  const location = useLocation()

  const currentTitle = (() => {
    if (location.pathname.startsWith('/admin/products/create')) return 'Create Product'
    if (location.pathname.startsWith('/admin/products')) return 'Products'
    if (location.pathname.startsWith('/admin/orders')) return 'Orders'
    if (location.pathname.startsWith('/admin/customers')) return 'Customers'
    if (location.pathname.startsWith('/admin/dashboard')) return 'Dashboard'
    return 'Taswouk Admin'
  })()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
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

