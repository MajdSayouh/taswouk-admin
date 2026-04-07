import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore.js'

/** Waits for Zustand persist to rehydrate from localStorage before auth guards run. */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    typeof useAuthStore.persist?.hasHydrated === 'function'
      ? useAuthStore.persist.hasHydrated()
      : false,
  )

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  return hydrated
}
