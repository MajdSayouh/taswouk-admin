// Slide-out navigation for viewports where the sidebar is hidden (see Sidebar: md:flex).
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Drawer, Segmented } from 'antd'
import { MenuOutlined, DownOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore.js'
import { getDashboardNavItems, isNavActive } from '../../navigation/dashboardNav.js'
import { ModerationNavBadge } from './ModerationNavBadge.jsx'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const items = getDashboardNavItems(user)
  const { t, i18n: i18nInstance } = useTranslation()
  const langValue = i18nInstance.language?.startsWith('ar') ? 'ar' : 'en'
  const [openKeys, setOpenKeys] = useState(() =>
    new Set(
      items
        .filter((item) =>
          item.children?.some((child) => isNavActive(location.pathname, child.to, child.match)),
        )
        .map((item) => item.key),
    ),
  )

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
        {t('mobile.menu')}
      </button>

      <Drawer
        title={
          <div className="flex flex-col gap-2 pe-6">
            <span className="font-medium">{t('mobile.navigation')}</span>
            <Segmented
              size="small"
              block
              value={langValue}
              options={[
                { label: t('topbar.langArabic'), value: 'ar' },
                { label: t('topbar.langEnglish'), value: 'en' },
              ]}
              onChange={(v) => void i18nInstance.changeLanguage(v)}
            />
          </div>
        }
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        width={280}
        id="dashboard-mobile-nav"
      >
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.Icon
            const hasChildren = Boolean(item.children?.length)
            const active = isNavActive(location.pathname, item.to, item.match)
            const childActive = item.children?.some((child) =>
              isNavActive(location.pathname, child.to, child.match),
            )
            const isOpen = openKeys.has(item.key) || childActive

            if (!hasChildren) {
              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.match === 'exact'}
                  onClick={() => setOpen(false)}
                  className={[
                    'dashboard-nav-link group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm no-underline outline-none transition-colors duration-150',
                    '!text-black hover:!text-black visited:!text-black active:!text-black',
                    'focus-visible:ring-2 focus-visible:ring-[#FF7D29]/35 focus-visible:ring-offset-2',
                    active
                      ? 'bg-[#FF7D29]/12 font-semibold shadow-sm ring-1 ring-[#FF7D29]/35'
                      : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[1.05rem] transition-colors',
                      active
                        ? 'bg-[#FF7D29] text-white shadow-sm'
                        : 'bg-slate-100 text-neutral-900 group-hover:bg-slate-200/90',
                    ].join(' ')}
                    aria-hidden
                  >
                    <Icon />
                  </span>
                  <span className="truncate leading-snug !text-black flex items-center gap-1.5">
                    {t(item.labelKey)}
                    {item.key === 'moderation' ? <ModerationNavBadge /> : null}
                  </span>
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
                  className={[
                    'dashboard-nav-link group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm no-underline outline-none transition-colors duration-150',
                    '!text-black hover:!text-black visited:!text-black active:!text-black',
                    'focus-visible:ring-2 focus-visible:ring-[#FF7D29]/35 focus-visible:ring-offset-2',
                    childActive
                      ? 'bg-[#FF7D29]/12 font-semibold shadow-sm ring-1 ring-[#FF7D29]/35'
                      : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[1.05rem] transition-colors',
                      childActive
                        ? 'bg-[#FF7D29] text-white shadow-sm'
                        : 'bg-slate-100 text-neutral-900 group-hover:bg-slate-200/90',
                    ].join(' ')}
                    aria-hidden
                  >
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
                          onClick={() => setOpen(false)}
                          className={[
                            'block rounded-lg px-2.5 py-2 text-sm no-underline outline-none transition-colors duration-150',
                            '!text-black hover:!text-black visited:!text-black active:!text-black',
                            'focus-visible:ring-2 focus-visible:ring-[#FF7D29]/35 focus-visible:ring-offset-2',
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
      </Drawer>
    </>
  )
}
