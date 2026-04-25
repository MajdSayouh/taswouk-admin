// Slide-out navigation for viewports where the sidebar is hidden (see Sidebar: md:flex).
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Drawer } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore.js'
import { getDashboardNavItems, isNavActive } from '../../navigation/dashboardNav.js'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const items = getDashboardNavItems(user)

  return (
    <>
      <button
        type="button"
        className="md:hidden inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="dashboard-mobile-nav"
      >
        <MenuOutlined />
        Menu
      </button>

      <Drawer
        title="Navigation"
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        width={280}
        id="dashboard-mobile-nav"
      >
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.match === 'exact'}
              onClick={() => setOpen(false)}
              className={() =>
                [
                  'flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors',
                  isNavActive(location.pathname, item.to, item.match)
                    ? 'bg-[#FF7D29]/10 text-[#FF7D29] border border-[#FF7D29]/30'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </Drawer>
    </>
  )
}
