/**
 * Firebase web client config (public keys only).
 * Set `VITE_FIREBASE_*` in `.env` — must stay in sync with `public/firebase-messaging-sw.js`.
 */
const FIREBASE_WEB_DEFAULTS = {
  apiKey: 'AIzaSyAYqWas-a2Z_ZmOWEf8HRFksNokeewtAD0',
  authDomain: 'taswouk-aa81f.firebaseapp.com',
  projectId: 'taswouk-aa81f',
  storageBucket: 'taswouk-aa81f.firebasestorage.app',
  messagingSenderId: '335473122274',
  appId: '1:335473122274:web:703c63358ee1b9957737bb',
  measurementId: 'G-WX3LYZ520S',
}

export function getFirebaseWebConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FIREBASE_WEB_DEFAULTS.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_WEB_DEFAULTS.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || FIREBASE_WEB_DEFAULTS.projectId,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || FIREBASE_WEB_DEFAULTS.storageBucket,
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || FIREBASE_WEB_DEFAULTS.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || FIREBASE_WEB_DEFAULTS.appId,
    measurementId:
      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || FIREBASE_WEB_DEFAULTS.measurementId,
  }
}

export function getFirebaseVapidKey() {
  const k = import.meta.env.VITE_FIREBASE_VAPID_KEY
  return k && String(k).trim() ? String(k).trim() : ''
}

export function isFirebaseConfigComplete() {
  const c = getFirebaseWebConfig()
  const vapid = getFirebaseVapidKey()
  return Boolean(
    c.apiKey &&
      c.projectId &&
      c.appId &&
      c.messagingSenderId &&
      vapid,
  )
}

/** Log FCM token + hints in the browser console (set `VITE_FCM_DEBUG=true` in `.env`). */
export function isFcmDebugEnabled() {
  return String(import.meta.env.VITE_FCM_DEBUG || '').toLowerCase() === 'true'
}
