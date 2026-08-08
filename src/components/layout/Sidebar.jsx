// View component: sidebar navigation for the admin shell (hidden below md — use MobileNav).
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DownOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore.js'
import { getDashboardNavItems, isNavActive } from '../../navigation/dashboardNav.js'

const navLinkClass = (active) =>
  [
    'dashboard-nav-link group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm no-underline outline-none transition-colors duration-150',
    '!text-black hover:!text-black visited:!text-black active:!text-black',
    'focus-visible:ring-2 focus-visible:ring-[#FF7D29]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    active
      ? 'bg-[#FF7D29]/12 font-semibold shadow-sm ring-1 ring-[#FF7D29]/35'
      : 'hover:bg-slate-50',
  ].join(' ')

const navIconWrapClass = (active) =>
  [
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[1.05rem] transition-colors',
    active ? 'bg-[#FF7D29] text-white shadow-sm' : 'bg-slate-100 text-neutral-900 group-hover:bg-slate-200/90',
  ].join(' ')

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const navItems = getDashboardNavItems(user)
  const { t } = useTranslation()
  const [openKeys, setOpenKeys] = useState(() =>
    new Set(
      navItems
        .filter(
          (item) =>
            item.children?.some((child) => isNavActive(location.pathname, child.to, child.match)),
        )
        .map((item) => item.key),
    ),
  )

  return (
    <aside className="hidden md:flex md:flex-col w-[17rem] shrink-0 bg-white border-e border-slate-200">
      <div className="h-16 flex items-center px-5 border-b border-slate-200 bg-white">
        <span className="text-lg font-semibold tracking-tight text-black">
          Jomran<span className="text-[#FF7D29]">Admin</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.Icon
          const hasChildren = Boolean(item.children?.length)
          const active = isNavActive(location.pathname, item.to, item.match)
          const childActive = item.children?.some((child) =>
            isNavActive(location.pathname, child.to, child.match),
          )
          const isOpen = openKeys.has(item.key) || childActive

          if (!hasChildren) {
            return (
              <NavLink key={item.key} to={item.to} end={item.match === 'exact'} className={navLinkClass(active)}>
                <span className={navIconWrapClass(active)} aria-hidden>
                  <Icon />
                </span>
                <span className="truncate leading-snug !text-black">{t(item.labelKey)}</span>
              </NavLink>
            )
          }

          return (
            <div key={item.key}>
              <button
                type="button"
                onClick={() =>
                  setOpenKeys((prev) => {
                    const next = new Set(prev)
                    if (next.has(item.key)) next.delete(item.key)
                    else next.add(item.key)
                    return next
                  })
                }
                aria-expanded={isOpen}
                className={[navLinkClass(childActive), 'w-full'].join(' ')}
              >
                <span className={navIconWrapClass(childActive)} aria-hidden>
                  <Icon />
                </span>
                <span className="truncate leading-snug !text-black flex-1 text-start">
                  {t(item.labelKey)}
                </span>
                <DownOutlined
                  className={[
                    'text-xs text-slate-500 transition-transform duration-150',
                    isOpen ? 'rotate-180' : '',
                  ].join(' ')}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <div className="mt-0.5 ms-6 space-y-0.5 border-s border-slate-200 ps-3">
                  {item.children.map((child) => {
                    const childIsActive = isNavActive(location.pathname, child.to, child.match)
                    return (
                      <NavLink
                        key={child.key}
                        to={child.to}
                        end={child.match === 'exact'}
                        className={[
                          'block rounded-lg px-2.5 py-2 text-sm no-underline outline-none transition-colors duration-150',
                          '!text-black hover:!text-black visited:!text-black active:!text-black',
                          'focus-visible:ring-2 focus-visible:ring-[#FF7D29]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                          childIsActive
                            ? 'bg-[#FF7D29]/12 font-semibold ring-1 ring-[#FF7D29]/35'
                            : 'hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {t(child.labelKey)}
                      </NavLink>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
