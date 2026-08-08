/**
 * Foreground FCM toasts must run through Ant Design's App context (useApp().notification).
 * Static `notification.open` from 'antd' often does not show when the app uses ConfigProvider only.
 *
 * @typedef {{ title: string; description: string; placement: 'topRight' | 'topLeft'; duration: number; url: string; variant?: 'order' | 'default' }} FcmToastPayload
 * duration `0` = must dismiss manually (Ant Design).
 */

/** @type {((p: FcmToastPayload) => void) | null} */
let foregroundHandler = null

export function registerDashboardFcmForegroundHandler(fn) {
  foregroundHandler = typeof fn === 'function' ? fn : null
}

export function unregisterDashboardFcmForegroundHandler() {
  foregroundHandler = null
}

/**
 * @param {FcmToastPayload} payload
 * @returns {boolean} true if routed to App context handler
 */
export function emitDashboardFcmForegroundToast(payload) {
  if (foregroundHandler) {
    foregroundHandler(payload)
    return true
  }
  return false
}
