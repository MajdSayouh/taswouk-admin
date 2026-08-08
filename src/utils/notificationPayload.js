/** Parse an optional JSON object used by BroadcastSchema / SendNotificationSchema. */
export function parseOptionalNotificationData(value) {
  const text = String(value ?? '').trim()
  if (!text) return undefined
  const parsed = JSON.parse(text)
  if (parsed == null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Notification data must be a JSON object')
  }
  return parsed
}

export function normalizeNotificationUserIds(values) {
  const input = Array.isArray(values) ? values : [values]
  return [...new Set(input.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
}
