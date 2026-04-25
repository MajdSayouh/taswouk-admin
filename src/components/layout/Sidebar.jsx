// View component: sidebar navigation for the admin shell (hidden below md — use MobileNav).
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { getDashboardNavItems, isNavActive } from '../../navigation/dashboardNav.js'

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const navItems = getDashboardNavItems(user)

  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-slate-200">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <span className="text-xl font-semibold tracking-tight">
          Jomran<span className="text-[#FF7D29]">Admin</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.match === 'exact'}
            className={() =>
              [
                'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                isNavActive(location.pathname, item.to, item.match)
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
