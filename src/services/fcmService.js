import { apiClient } from './apiClient.js'

const WEB_DEVICE_TYPE = 'web'
const DEVICE_TOKEN_KEY = 'taswouk_web_device_token'
const LAST_FCM_TOKEN_KEY = 'taswouk_web_last_fcm_token'

function readStorage(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function generateDeviceToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `web_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/** @see https://test.taswouk.com/api/docs#/Devices/accounts_api_register_device */
export function getFcmDevicesPath() {
  const current = import.meta.env.VITE_FCM_DEVICES_PATH
  if (current && String(current).trim()) return String(current).trim()

  // Backward compatibility with previous env name.
  const legacy = import.meta.env.VITE_FCM_REGISTER_PATH
  if (legacy && String(legacy).trim()) return String(legacy).trim()

  return '/api/accounts/devices'
}

export function getWebDeviceToken() {
  const existing = readStorage(DEVICE_TOKEN_KEY)
  if (existing) return existing
  const created = generateDeviceToken()
  writeStorage(DEVICE_TOKEN_KEY, created)
  return created
}

export function getLastKnownFcmToken() {
  return readStorage(LAST_FCM_TOKEN_KEY)
}

export function setLastKnownFcmToken(token) {
  writeStorage(LAST_FCM_TOKEN_KEY, String(token || ''))
}

/**
 * Register / refresh web push device (POST RegisterDeviceSchema).
 * Logout passes `isActive: false` → same endpoint with empty `fcm_token` (schema default).
 * @param {{ fcmToken: string, isActive: boolean }} params
 * @returns {Promise<unknown>}
 */
export async function upsertWebDevice({ fcmToken, isActive }) {
  const path = getFcmDevicesPath()
  const payload = {
    device_token: getWebDeviceToken(),
    device_type: WEB_DEVICE_TYPE,
    fcm_token: isActive ? String(fcmToken || '') : '',
  }
  const { data } = await apiClient.post(path, payload)
  return data
}
