// Route guard: admin UI requires a session. Unauthenticated users go to login with return URL in state.
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '../store/authStore.js'
import { useAuthHydrated } from '../hooks/useAuthHydrated.js'

export function RequireAuth() {
  const hydrated = useAuthHydrated()
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
