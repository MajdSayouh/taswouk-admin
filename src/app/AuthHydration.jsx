// After Zustand rehydrates the JWT from localStorage, load the profile once so the UI has `user`.
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'

export function AuthHydration({ children }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    if (!token || user) return
    let cancelled = false
    ;(async () => {
      try {
        const { getProfile } = await import('../services/authService.js')
        const profile = await getProfile()
        if (!cancelled) setUser(profile)
      } catch {
        // 401 with a stored token is handled in apiClient (logout + toast).
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, user, setUser])

  return children
}
