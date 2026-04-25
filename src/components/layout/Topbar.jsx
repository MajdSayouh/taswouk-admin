// View component: top bar — session + optional cached user from auth store (GET /me refreshed on layout mount).
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { Button } from '../ui/Button'

export function Topbar({ title }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const email = user?.email?.trim()
  const first = user?.first_name?.trim()
  const last = user?.last_name?.trim()
  const labelFromName = first || last ? [first, last].filter(Boolean).join(' ') : ''
  const displayName = token ? labelFromName || email || user?.role || 'Account' : 'Guest'
  const subtitle = token ? email || user?.phone || 'Signed in' : 'Not signed in'
  const avatarInitial =
    token && (first || email)
      ? String(first || email).charAt(0).toUpperCase()
      : token
        ? 'A'
        : '?'

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4 lg:px-8">
      <div>
        <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">
          Jomran ecommerce administration panel
        </p>
      </div>

      <div className="flex items-center gap-3">
        {token ? (
          <Button type="button" variant="ghost" onClick={() => logout()}>
            Sign out
          </Button>
        ) : (
          <Button as={Link} to="/admin/login" variant="ghost">
            Sign in
          </Button>
        )}
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors"
        >
          <span className="sr-only">View notifications</span>
          <span className="text-lg">🔔</span>
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF7D29] text-[10px] font-semibold text-white px-0.5">
            3
          </span>
        </button>

        {token ? (
          <Link
            to="/admin/profile"
            className="flex items-center gap-3 rounded-lg hover:bg-slate-50 px-2 py-1 -mr-2 transition-colors"
            title="View profile"
          >
            <div className="hidden sm:flex flex-col items-end min-w-0">
              <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                {displayName}
              </span>
              <span className="text-xs text-slate-500 truncate max-w-[200px]">{subtitle}</span>
            </div>
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#FF7D29] to-amber-400 flex items-center justify-center text-sm font-semibold text-white">
              {avatarInitial}
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
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
