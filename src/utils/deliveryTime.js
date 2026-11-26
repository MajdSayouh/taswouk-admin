/**
 * «وقت التسليم» — when the driver confirmed an order delivered.
 *
 * The server stamps `delivered_at` the moment the driver taps «تأكيد التسليم» in
 * the delivery app; the dashboard only reads it. For a cart split across sellers
 * the cart's `delivered_at` stays empty until every live part is delivered, and
 * each part carries its own.
 */

/** @param {unknown} value */
export function parseInstant(value) {
  if (value == null || value === '') return null
  const date = new Date(/** @type {string} */ (value))
  return Number.isFinite(date.getTime()) ? date : null
}

/**
 * Whole minutes from placing the order to its delivery, or null when either end
 * is missing or the order reads as delivered before it was placed.
 * @param {unknown} createdAt
 * @param {unknown} deliveredAt
 */
export function deliveryDurationMinutes(createdAt, deliveredAt) {
  const start = parseInstant(createdAt)
  const end = parseInstant(deliveredAt)
  if (!start || !end) return null
  const minutes = Math.floor((end.getTime() - start.getTime()) / 60000)
  return minutes >= 0 ? minutes : null
}

/**
 * @param {number | null} minutes
 * @returns {{ days: number; hours: number; minutes: number } | null}
 */
export function splitDuration(minutes) {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return null
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  }
}

/**
 * How far a split cart has got: parts delivered out of the parts still alive.
 * @param {{ status: string; deliveredAt?: string | null }[]} parts
 */
export function partsDeliveryProgress(parts) {
  const live = (Array.isArray(parts) ? parts : []).filter((p) => p.status !== 'cancelled')
  return {
    delivered: live.filter((p) => p.status === 'delivered').length,
    total: live.length,
  }
}

/** Sort key for the column: delivered orders by time, the rest after them. */
export function deliveredAtSortValue(deliveredAt) {
  const date = parseInstant(deliveredAt)
  return date ? date.getTime() : Number.POSITIVE_INFINITY
}
