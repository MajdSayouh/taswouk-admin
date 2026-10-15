/**
 * Pure helpers for the live drivers map and the delivery route view.
 * Shapes follow GET /api/delivery/drivers/live and
 * GET /api/delivery/assignments/{id}/route.
 */

/** @typedef {'onTheRoad' | 'assigned' | 'available' | 'stale' | 'noLocation'} DriverState */

/** Display order in the side list: on the road first, never-located last. */
export const DRIVER_STATE_ORDER = /** @type {DriverState[]} */ ([
  'onTheRoad',
  'assigned',
  'available',
  'stale',
  'noLocation',
])

/**
 * A lost signal outranks everything else: a driver "on the road" whose last
 * position is ten minutes old must not look live on the map.
 * `assigned` = has an open order but has not picked it up yet.
 * @param {{ location?: { is_stale?: boolean } | null; on_the_road?: boolean; open_orders?: unknown[] }} driver
 * @returns {DriverState}
 */
export function driverState(driver) {
  if (!driver?.location) return 'noLocation'
  if (driver.location.is_stale) return 'stale'
  if (driver.on_the_road) return 'onTheRoad'
  if (Array.isArray(driver.open_orders) && driver.open_orders.length > 0) return 'assigned'
  return 'available'
}

/**
 * @param {'all' | DriverState} filter
 * @param {DriverState} state
 */
export function stateMatchesFilter(filter, state) {
  if (filter === 'all') return true
  // "Available" in the filter means free right now; an assigned driver is not.
  return filter === state
}

/**
 * Sorted copy: by state (DRIVER_STATE_ORDER), then freshest position, then name.
 * @template {{ name?: string; location?: { seconds_since_update?: number } | null }} T
 * @param {T[]} drivers
 * @returns {T[]}
 */
export function sortDrivers(drivers) {
  const rank = (d) => DRIVER_STATE_ORDER.indexOf(driverState(d))
  return [...drivers].sort((a, b) => {
    const byState = rank(a) - rank(b)
    if (byState) return byState
    const ageA = a.location?.seconds_since_update ?? Infinity
    const ageB = b.location?.seconds_since_update ?? Infinity
    if (ageA !== ageB) return ageA - ageB
    return String(a.name ?? '').localeCompare(String(b.name ?? ''))
  })
}

/**
 * Elapsed time as one value + unit, for "updated N ago".
 * @param {number | null | undefined} seconds
 * @returns {{ value: number; unit: 'seconds' | 'minutes' | 'hours' | 'days' } | null}
 */
export function elapsedParts(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null
  if (seconds < 60) return { value: Math.floor(seconds), unit: 'seconds' }
  if (seconds < 3600) return { value: Math.floor(seconds / 60), unit: 'minutes' }
  if (seconds < 86400) return { value: Math.floor(seconds / 3600), unit: 'hours' }
  return { value: Math.floor(seconds / 86400), unit: 'days' }
}

const EARTH_RADIUS_M = 6371000

/**
 * Great-circle distance in metres.
 * @param {{ latitude: number; longitude: number }} a
 * @param {{ latitude: number; longitude: number }} b
 */
export function haversineMeters(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLng = rad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Distance travelled along the recorded points, in metres.
 * @param {{ latitude: number; longitude: number }[]} points
 */
export function routeDistanceMeters(points) {
  let total = 0
  for (let i = 1; i < points.length; i += 1) total += haversineMeters(points[i - 1], points[i])
  return total
}

/**
 * Whole minutes between two ISO timestamps; null if either is missing or invalid.
 * @param {string | null | undefined} fromIso
 * @param {string | null | undefined} toIso
 */
export function minutesBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  const ms = Date.parse(toIso) - Date.parse(fromIso)
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60000)
}

/**
 * True when the backend still extends this route (the driver is on the road).
 * @param {{ status?: string } | null | undefined} route
 */
export function isRouteLive(route) {
  return route?.status === 'out_for_delivery'
}
