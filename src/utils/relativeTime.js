/**
 * Minimal, dependency-free "how long ago" formatter — no dayjs/date-fns in this project's own
 * dependencies (only present as antd's nested dep, not safe to import directly).
 */

/**
 * @param {string | number | Date | null | undefined} value
 * @param {(key: string, params?: Record<string, unknown>) => string} t — translation function
 * @returns {string} e.g. "3h" / "2d" / "just now", or '—' if `value` doesn't parse
 */
export function formatRelativeTime(value, t) {
  if (value == null || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  const ms = date.getTime()
  if (!Number.isFinite(ms)) return '—'
  const diffSeconds = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (diffSeconds < 60) return t('moderation.queue.justNow')
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return t('moderation.queue.minutesAgo', { count: diffMinutes })
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return t('moderation.queue.hoursAgo', { count: diffHours })
  const diffDays = Math.floor(diffHours / 24)
  return t('moderation.queue.daysAgo', { count: diffDays })
}
