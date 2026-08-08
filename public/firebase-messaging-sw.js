/* global importScripts, firebase */
/**
 * FCM service worker (background + click). Keep `firebase.initializeApp` config
 * in sync with `VITE_FIREBASE_*` in the project root `.env`.
 * @see https://firebase.google.com/docs/cloud-messaging/js/client
 */
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAYqWas-a2Z_ZmOWEf8HRFksNokeewtAD0',
  authDomain: 'taswouk-aa81f.firebaseapp.com',
  projectId: 'taswouk-aa81f',
  storageBucket: 'taswouk-aa81f.firebasestorage.app',
  messagingSenderId: '335473122274',
  appId: '1:335473122274:web:703c63358ee1b9957737bb',
  measurementId: 'G-WX3LYZ520S',
})

const messaging = firebase.messaging()

function stringDataPayload(data) {
  if (!data || typeof data !== 'object') return {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const k of Object.keys(data)) {
    const v = data[k]
    out[k] = v == null ? '' : typeof v === 'string' ? v : String(v)
  }
  return out
}

function inferAdminPathFromData(sd) {
  var oid = (sd.order_id || sd.orderId || '').trim()
  if (oid) return '/orders'
  var ev = String(sd.event || sd.type || '').toLowerCase()
  if (
    ev.indexOf('order') !== -1 ||
    ev === 'order_created' ||
    ev === 'order_confirmed' ||
    ev === 'order_assigned' ||
    ev === 'order_delivered'
  ) {
    return '/orders'
  }
  return ''
}

function displayFromPayload(payload) {
  const n = payload.notification || {}
  const sd = stringDataPayload(payload.data)
  const title = String(n.title || sd.title || sd.notification_title || 'Notification').trim() || 'Notification'
  const body = String(n.body || sd.body || sd.message || sd.notification_body || '')
  var urlPath = sd.url || sd.link || inferAdminPathFromData(sd) || '/home'
  return { title, body, sd, urlPath }
}

messaging.onBackgroundMessage((payload) => {
  const { title, body, sd, urlPath } = displayFromPayload(payload)
  const options = {
    body,
    icon: sd.icon ? String(sd.icon) : undefined,
    data: {
      ...sd,
      url: urlPath,
    },
    tag: sd.tag ? String(sd.tag) : payload.messageId || 'taswouk-fcm',
    renotify: true,
  }
  return self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = event.notification.data || {}
  const path = typeof d.url === 'string' && d.url ? d.url : '/home'
  const fullUrl = new URL(path, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) return client.focus().then(() => client.navigate(fullUrl))
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl)
    }),
  )
})
