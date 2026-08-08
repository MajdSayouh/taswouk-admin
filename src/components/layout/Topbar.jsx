// View component: top bar — session + optional cached user from auth store (GET /me refreshed on layout mount).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Segmented } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuthStore, isAdminRole } from '../../store/authStore.js'
import { deactivateDashboardFirebaseDevice } from '../../firebase/dashboardMessaging.js'
import { useAdminNotificationFeed } from '../../hooks/useAdminNotificationFeed.js'
import { Button } from '../ui/Button'

export function Topbar({ title }) {
  const { t, i18n: i18nInstance } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = Boolean(user && isAdminRole(user.role))
  const [isBellOpen, setIsBellOpen] = useState(false)
  const bellContainerRef = useRef(null)
  const bellBtnRef = useRef(null)
  const bellPanelRef = useRef(null)
  const [bellPanelPos, setBellPanelPos] = useState(/** @type {null | { top: number; left: number; width: number }} */ (null))
  const {
    items: bellItems,
    refetchLog,
    unreadCount,
    refetchUnread,
    markBellItemRead,
  } = useAdminNotificationFeed(Boolean(token))

  const email = user?.email?.trim()
  const first = user?.first_name?.trim()
  const last = user?.last_name?.trim()
  const labelFromName = first || last ? [first, last].filter(Boolean).join(' ') : ''
  const displayName = token
    ? labelFromName || email || user?.role || t('topbar.account')
    : t('topbar.guest')
  const subtitle = token ? email || user?.phone || t('topbar.signedIn') : t('topbar.notSignedIn')
  const avatarInitial =
    token && (first || email)
      ? String(first || email).charAt(0).toUpperCase()
      : token
        ? 'A'
        : '?'

  const langValue = i18nInstance.language?.startsWith('ar') ? 'ar' : 'en'
  const notificationCount = Math.min(99, unreadCount)

  useLayoutEffect(() => {
    if (!isBellOpen || !bellBtnRef.current) {
      setBellPanelPos(null)
      return undefined
    }
    function updatePos() {
      const el = bellBtnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const panelWidth = 320
      const gap = 8
      let left = rect.right - panelWidth
      left = Math.max(gap, Math.min(left, window.innerWidth - panelWidth - gap))
      setBellPanelPos({
        top: rect.bottom + gap,
        left,
        width: panelWidth,
      })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [isBellOpen])

  useEffect(() => {
    function onPointerDown(event) {
      if (!isBellOpen) return
      const t = /** @type {Node | null} */ (event.target)
      if (!t) return
      if (bellContainerRef.current?.contains(t) || bellPanelRef.current?.contains(t)) return
      setIsBellOpen(false)
    }
    function onEscape(event) {
      if (event.key === 'Escape') setIsBellOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [isBellOpen])

  async function handleSignOut() {
    try {
      await deactivateDashboardFirebaseDevice()
    } finally {
      logout()
    }
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4 lg:px-8 gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-slate-900 truncate">
          {title}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">{t('topbar.subtitle')}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Segmented
          size="small"
          value={langValue}
          options={[
            { label: t('topbar.langArabic'), value: 'ar' },
            { label: t('topbar.langEnglish'), value: 'en' },
          ]}
          onChange={(v) => {
            void i18nInstance.changeLanguage(v)
          }}
        />
        {token ? (
          <Button type="button" variant="ghost" onClick={() => void handleSignOut()}>
            {t('topbar.signOut')}
          </Button>
        ) : (
          <Button as={Link} to="/login" variant="ghost">
            {t('topbar.signIn')}
          </Button>
        )}
        <div ref={bellContainerRef} className="relative">
          <button
            ref={bellBtnRef}
            type="button"
            onClick={() => {
              setIsBellOpen((v) => {
                const next = !v
                if (next) {
                  void refetchLog()
                  void refetchUnread()
                }
                return next
              })
            }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors"
          >
            <span className="sr-only">{t('topbar.notificationsSr')}</span>
            <span className="text-lg">🔔</span>
            {notificationCount > 0 ? (
              <span className="absolute -top-0.5 -end-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF7D29] text-[10px] font-semibold text-white px-0.5">
                {notificationCount}
              </span>
            ) : null}
          </button>
          {isBellOpen && bellPanelPos
            ? createPortal(
                <div
                  ref={bellPanelRef}
                  style={{
                    position: 'fixed',
                    top: bellPanelPos.top,
                    left: bellPanelPos.left,
                    width: bellPanelPos.width,
                    zIndex: 10000,
                  }}
                  className="max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white shadow-xl p-2"
                >
                  <div className="px-2 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">{t('topbar.notificationsTitle')}</span>
                    {isAdmin ? (
                      <Link
                        to="/notifications"
                        className="text-xs font-medium text-[#FF7D29] hover:underline shrink-0"
                        onClick={() => setIsBellOpen(false)}
                      >
                        {t('topbar.notificationsLogLink')}
                      </Link>
                    ) : null}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {bellItems.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-slate-500">{t('topbar.notificationsEmpty')}</p>
                    ) : (
                      bellItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setIsBellOpen(false)
                            void markBellItemRead(item).catch(() => undefined)
                            if (item.url) window.location.href = item.url
                          }}
                          className={`w-full text-start rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors ${
                            item.source === 'log' && !item.isRead ? 'bg-orange-50/60' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">
                              {item.source === 'live'
                                ? t('topbar.notificationsSourceLive')
                                : t('topbar.notificationsSourceLog')}
                            </span>
                            {item.source === 'log' && item.status ? (
                              <span className="text-[10px] text-slate-400 truncate">{String(item.status)}</span>
                            ) : null}
                          </div>
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">{item.body}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>,
                document.body,
              )
            : null}
        </div>

        {token ? (
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg hover:bg-slate-50 px-2 py-1 -me-2 transition-colors"
            title={t('topbar.profileLinkTitle')}
          >
            <div className="hidden sm:flex flex-col min-w-0 items-end text-end max-w-[200px]">
              <span className="text-sm font-medium text-slate-900 truncate w-full">{displayName}</span>
              <span className="text-xs text-slate-500 truncate w-full">{subtitle}</span>
            </div>
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#FF7D29] to-amber-400 flex items-center justify-center text-sm font-semibold text-white">
              {avatarInitial}
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-end">
              <span className="text-sm font-medium text-slate-900">{displayName}</span>
              <span className="text-xs text-slate-500">{subtitle}</span>
            </div>
            <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
              {avatarInitial}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
