/**
 * FCM for admin dashboard: token + foreground notifications.
 * Background messages are handled by `public/firebase-messaging-sw.js`.
 */
import { createElement } from 'react'
import { getApps, initializeApp } from 'firebase/app'
import { BellOutlined, ShoppingOutlined } from '@ant-design/icons'
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { notification } from 'antd'
import i18n from '../i18n/i18n.js'
import { resolveFcmToastDisplay } from '../utils/fcmPayload.js'
import { emitDashboardFcmForegroundToast } from './fcmUiBridge.js'
import {
  getFirebaseVapidKey,
  getFirebaseWebConfig,
  isFcmDebugEnabled,
  isFirebaseConfigComplete,
} from './config.js'
import {
  getLastKnownFcmToken,
  getWebDeviceToken,
  setLastKnownFcmToken,
  upsertWebDevice,
} from '../services/fcmService.js'
import { queryClient } from '../query/queryClient.js'
import { queryKeys } from '../query/queryKeys.js'

let messagingSingleton = null
/** @type {(() => void) | null} */
let foregroundUnsubscribe = null
/** Single-flight setup (avoids duplicate `onMessage` under React Strict Mode). */
let setupPromise = null
const MAX_RECENT_NOTIFICATIONS = 20
/** @type {Array<{id:string,title:string,body:string,url:string,createdAt:number,data:Record<string, unknown>}>} */
let recentNotifications = []
/** @type {Set<(items: Array<{id:string,title:string,body:string,url:string,createdAt:number,data:Record<string, unknown>}>) => void>} */
const notificationSubscribers = new Set()

function getOrInitApp() {
  const cfg = getFirebaseWebConfig()
  if (getApps().length) return getApps()[0]
  return initializeApp(cfg)
}

/** @returns {Promise<ReturnType<typeof getMessaging> | null>} */
export async function getMessagingIfReady() {
  if (!isFirebaseConfigComplete()) return null
  if (typeof window === 'undefined') return null
  const ok = await isSupported()
  if (!ok) return null
  const app = getOrInitApp()
  if (!messagingSingleton) {
    messagingSingleton = getMessaging(app)
  }
  return messagingSingleton
}

const LAST_SENT_KEY = 'taswouk_fcm_token_sent'

function lastSentToken() {
  try {
    return sessionStorage.getItem(LAST_SENT_KEY) || ''
  } catch {
    return ''
  }
}

function setLastSentToken(token) {
  try {
    sessionStorage.setItem(LAST_SENT_KEY, token)
  } catch {
    /* ignore */
  }
}

/**
 * Register SW + obtain FCM token; optionally POST to API.
 * @returns {Promise<string | null>}
 */
export async function acquireAndRegisterFcmToken() {
  const messaging = await getMessagingIfReady()
  if (!messaging) return null

  const vapidKey = getFirebaseVapidKey()
  if (!vapidKey) return null

  // Vite serves `public/` under the configured `base` (e.g. `/dashboard/` in
  // this project), so the service worker file — and its scope — must be
  // resolved relative to `import.meta.env.BASE_URL`, not hardcoded to `/`.
  // A hardcoded root path 404s whenever the app isn't served from the domain
  // root, which silently breaks getToken()/onMessage() and background push.
  const swUrl = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`
  const registration = await navigator.serviceWorker.register(swUrl, {
    scope: import.meta.env.BASE_URL,
  })
  await registration.update?.()

  let perm = Notification.permission
  if (perm === 'default') {
    perm = await Notification.requestPermission()
  }
  if (perm !== 'granted') {
    if (isFcmDebugEnabled()) {
      console.warn('[FCM] Notification permission not granted — allow notifications for this site to receive pushes.')
    }
    return null
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })
  if (!token) {
    if (isFcmDebugEnabled()) console.warn('[FCM] getToken returned empty — check VAPID key and authorized domains.')
    return null
  }

  if (isFcmDebugEnabled()) {
    console.info(
      '[FCM] Registration token (paste into Firebase Console → Messaging → send test / campaign):\n',
      token,
    )
  }
  setLastKnownFcmToken(token)

  // Do not await API registration — a slow / failing POST must not delay getToken + onMessage setup.
  if (token !== lastSentToken()) {
    void (async () => {
      try {
        await upsertWebDevice({ fcmToken: token, isActive: true })
        setLastSentToken(token)
      } catch (err) {
        console.warn('[FCM] register token with API failed', err)
      }
    })()
  }

  return token
}

export async function deactivateDashboardFirebaseDevice() {
  const token = getLastKnownFcmToken() || lastSentToken()
  if (!token) return
  try {
    await upsertWebDevice({ fcmToken: token, isActive: false })
  } catch (err) {
    console.warn('[FCM] deactivate device failed', err)
  }
}

function translate(key, fallback) {
  const t = i18n.t(key, { ns: 'common', defaultValue: fallback })
  return typeof t === 'string' ? t : fallback
}

function notifySubscribers() {
  const snapshot = [...recentNotifications]
  for (const listener of notificationSubscribers) {
    try {
      listener(snapshot)
    } catch {
      /* ignore subscriber errors */
    }
  }
}

function fcmCopyBundle() {
  return {
    defaultTitle: translate('fcm.defaultTitle', 'Notification'),
    defaultBody: translate('fcm.defaultBody', 'You have a new message.'),
    newOrderTitle: translate('fcm.newOrderTitle', 'New order'),
    newOrderBody: translate('fcm.newOrderBody', 'Order #{{order}} was placed from the app.'),
    newOrderBodyGeneric: translate(
      'fcm.newOrderBodyGeneric',
      'A new order was placed from the app.',
    ),
  }
}

function normalizeNotificationPayload(payload) {
  const resolved = resolveFcmToastDisplay(payload, fcmCopyBundle())
  return {
    id: `${payload.messageId || 'msg'}_${Date.now()}`,
    title: resolved.title,
    body: resolved.body,
    url: resolved.url,
    createdAt: Date.now(),
    data: resolved.data,
    isNewOrder: resolved.isNewOrder,
    isOrderRelated: resolved.isOrderRelated,
  }
}

function pushRecentNotification(entry) {
  recentNotifications = [entry, ...recentNotifications].slice(0, MAX_RECENT_NOTIFICATIONS)
  notifySubscribers()
}

export function subscribeDashboardNotifications(listener) {
  if (typeof listener !== 'function') return () => {}
  notificationSubscribers.add(listener)
  listener([...recentNotifications])
  return () => {
    notificationSubscribers.delete(listener)
  }
}

export function getRecentDashboardNotifications() {
  return [...recentNotifications]
}

function handleForegroundPayload(payload) {
  if (isFcmDebugEnabled()) console.debug('[FCM] foreground message', payload)

  const entry = normalizeNotificationPayload(payload)
  pushRecentNotification(entry)
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() })
  if (entry.isOrderRelated) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
  }

  const placement = i18n.language?.startsWith('ar') ? 'topLeft' : 'topRight'
  const routed = emitDashboardFcmForegroundToast({
    title: entry.title,
    description: entry.body,
    placement,
    duration: 0,
    url: entry.url,
    variant: entry.isNewOrder ? 'order' : 'default',
  })
  // Fallback when App bridge is not mounted (Strict Mode timing / rare shells).
  if (!routed) {
    const Icon = entry.isNewOrder ? ShoppingOutlined : BellOutlined
    const iconColor = entry.isNewOrder ? '#c2410c' : '#15803d'
    notification.open({
      className: 'dashboard-fcm-push-notification',
      icon: createElement(Icon, {
        style: { color: iconColor, fontSize: 22 },
      }),
      message: entry.title,
      description: entry.body,
      placement,
      duration: 0,
      onClick: () => {
        window.location.href = entry.url
      },
    })
  }
}

/**
 * One-shot setup after auth: token registration + foreground listener.
 */
export async function setupDashboardFirebaseMessaging() {
  if (!isFirebaseConfigComplete()) {
    console.debug('[FCM] skipped — set VITE_FIREBASE_* and VITE_FIREBASE_VAPID_KEY in .env')
    return
  }

  if (setupPromise) return setupPromise

  setupPromise = (async () => {
    // Subscribe via getToken first; then foreground listener (required for web push delivery).
    try {
      await acquireAndRegisterFcmToken()
    } catch (err) {
      console.warn('[FCM] acquireAndRegisterFcmToken failed — check permission, VAPID, and Service Worker.', err)
    }

    const messaging = await getMessagingIfReady()
    if (messaging && !foregroundUnsubscribe) {
      foregroundUnsubscribe = onMessage(messaging, handleForegroundPayload)
      if (isFcmDebugEnabled()) {
        console.info(
          '[FCM] Foreground listener registered. With this tab focused, Firebase "Send test message" uses onMessage. Minimize the tab to test background (service worker).',
        )
      }
    }
  })()

  try {
    await setupPromise
  } catch (e) {
    setupPromise = null
    throw e
  }
}

export function teardownDashboardFirebaseMessaging() {
  if (foregroundUnsubscribe) {
    foregroundUnsubscribe()
    foregroundUnsubscribe = null
  }
  setupPromise = null
}

export function ensureWebDeviceIdentity() {
  getWebDeviceToken()
}
