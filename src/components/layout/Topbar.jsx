// View component: top bar — reads `user` from the auth store (filled after login / profile fetch).
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { Button } from '../ui/Button'

function initials(user) {
  if (!user) return '?'
  const first = user.first_name?.[0] ?? ''
  const last = user.last_name?.[0] ?? ''
  if (first || last) return `${first}${last}`.toUpperCase()
  const mail = user.email?.[0] ?? user.phone?.[0] ?? 'U'
  return mail.toUpperCase()
}

export function Topbar({ title }) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)

  const displayName =
    user && (user.first_name || user.last_name)
      ? [user.first_name, user.last_name].filter(Boolean).join(' ')
      : user?.email || user?.phone || 'Guest'

  const subtitle = user?.email || user?.phone || 'Not signed in'

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4 lg:px-8">
      <div>
        <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">
          Taswouk ecommerce administration panel
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

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900">{displayName}</span>
            <span className="text-xs text-slate-500">{subtitle}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#FF7D29] to-amber-400 flex items-center justify-center text-sm font-semibold text-white">
            {initials(user)}
          </div>
        </div>
      </div>
    </header>
  )
}
