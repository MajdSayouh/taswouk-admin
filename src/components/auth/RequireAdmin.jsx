// Admin-only route segment: non-admins are sent to the dashboard.
// Supports either `<Outlet />` layout routes or wrapped children: `<RequireAdmin><Page /></RequireAdmin>`.
import { Navigate, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore, isAdminRole } from '../../store/authStore.js'
import { useAuthHydrated } from '../../hooks/useAuthHydrated.js'

export function RequireAdmin({ children }) {
  const hydrated = useAuthHydrated()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAdminRole(user.role)) {
    return <Navigate to="/home" replace />
  }

  if (children != null) {
    return <>{children}</>
  }

  return <Outlet />
}
