// If already signed in, visiting /admin/login sends the user back to the app (or the page they came from).
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '../store/authStore.js'
import { useAuthHydrated } from '../hooks/useAuthHydrated.js'

export function GuestOnly() {
  const hydrated = useAuthHydrated()
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  const redirectTo = location.state?.from ?? { pathname: '/admin/dashboard' }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    )
  }

  if (token) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
