import { useEffect } from 'react'
import {
  ensureWebDeviceIdentity,
  setupDashboardFirebaseMessaging,
  teardownDashboardFirebaseMessaging,
} from '../firebase/dashboardMessaging.js'

function deferNonCriticalTask(task) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => task(), { timeout: 4000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(task, 1500)
  return () => window.clearTimeout(id)
}

/**
 * Initialize FCM when the user is signed in (admin session).
 * Deferred so first paint and dashboard data are not blocked.
 * @param {boolean} enabled — e.g. `Boolean(authToken)`
 */
export function useDashboardFirebaseMessaging(enabled) {
  useEffect(() => {
    if (!enabled) {
      teardownDashboardFirebaseMessaging()
      return undefined
    }

    let cancelled = false
    ensureWebDeviceIdentity()

    const cancelDefer = deferNonCriticalTask(() => {
      ;(async () => {
        try {
          await setupDashboardFirebaseMessaging()
        } catch (e) {
          if (!cancelled) console.warn('[FCM] setup failed', e)
        }
      })()
    })

    return () => {
      cancelled = true
      cancelDefer()
      teardownDashboardFirebaseMessaging()
    }
  }, [enabled])
}
