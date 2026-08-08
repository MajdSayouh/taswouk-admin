/**
 * Admin notification log + broadcast + targeted send + unread + mark read.
 * @see https://v2.taswouk.com/api/docs#/Notifications
 */
import { apiClient } from './apiClient.js'

/**
 * GET /api/notifications/
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function listNotifications(options = {}) {
  const { data } = await apiClient.get('/api/notifications/', { signal: options.signal })
  const list = Array.isArray(data) ? data : []
  return [...list].sort((a, b) => {
    const idA = Number(a?.id) || 0
    const idB = Number(b?.id) || 0
    return idB - idA
  })
}

/**
 * GET /api/notifications/unread-count
 * @returns {Promise<{ count: number }>}
 */
export async function getUnreadNotificationCount(options = {}) {
  const { data } = await apiClient.get('/api/notifications/unread-count', {
    signal: options.signal,
  })
  const n = Number(data?.count)
  return { count: Number.isFinite(n) ? n : 0 }
}

/**
 * POST /api/notifications/{notification_id}/read
 * @param {number} notificationId
 * @returns {Promise<unknown>}
 */
export async function markNotificationRead(notificationId) {
  const id = Number(notificationId)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid notification id')
  const { data } = await apiClient.post(`/api/notifications/${id}/read`)
  return data
}

/**
 * POST /api/notifications/broadcast — BroadcastSchema: title, body, optional data.
 * Mass / topic audience rules are defined on the server (204 No Content).
 */
export async function broadcastNotification(payload) {
  const title = String(payload?.title ?? '').trim()
  const body = String(payload?.body ?? '').trim()
  if (!title || !body) throw new Error('Notification title and body are required')
  await apiClient.post('/api/notifications/broadcast', {
    title,
    body,
    ...(payload.data != null && Object.keys(payload.data).length ? { data: payload.data } : {}),
  })
}

/**
 * POST /api/notifications/send — SendNotificationSchema: title, body, user_ids, optional data,
 * optional type (API default GENERAL).
 */
export async function sendNotificationToUsers(payload) {
  const title = String(payload?.title ?? '').trim()
  const notificationBody = String(payload?.body ?? '').trim()
  const userIds = [...new Set(
    (Array.isArray(payload?.user_ids) ? payload.user_ids : [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0),
  )]
  if (!title || !notificationBody) throw new Error('Notification title and body are required')
  if (userIds.length === 0) throw new Error('At least one user is required')
  const typeRaw = payload.type != null ? String(payload.type).trim() : ''
  const type = typeRaw || 'GENERAL'
  const body = {
    title,
    body: notificationBody,
    user_ids: userIds,
    type,
    ...(payload.data != null && Object.keys(payload.data).length ? { data: payload.data } : {}),
  }
  const { data } = await apiClient.post('/api/notifications/send', body)
  return data
}
