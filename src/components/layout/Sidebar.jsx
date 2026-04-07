// View component: sidebar navigation for the admin shell.
// Links map to routes; it stays dumb and presentational.
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Products', to: '/admin/products' },
  { label: 'Customers', to: '/admin/customers' },
  { label: 'Categories', to: '/admin/categories' },
  { label: 'Brands', to: '/admin/brands' },
  { label: 'Vendors', to: '/admin/vendors' },
  { label: 'Stores', to: '/admin/stores' },
  { label: 'Blog', to: '/admin/blog' },
  { label: 'Marketing', to: '/admin/marketing' },
  { label: 'Analytics', to: '/admin/analytics' },
  { label: 'Settings', to: '/admin/settings' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-slate-200">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <span className="text-xl font-semibold tracking-tight">
          Taswouk<span className="text-[#FF7D29]">Admin</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                isActive
                  ? 'bg-[#FF7D29]/10 text-[#FF7D29] border border-[#FF7D29]/30'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')
            }
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

