/**
 * Delivery tracking — admin-only live driver positions and trip routes.
 * Spec: docs/live-drivers-map.md
 */
import { apiClient } from './apiClient.js'

/**
 * GET /api/delivery/drivers/live — every active driver, last position (null if never
 * sent) and the orders assigned to them that are not finished yet.
 * @param {{ onlyLocated?: boolean; signal?: AbortSignal }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function getLiveDrivers(options = {}) {
  const { data } = await apiClient.get('/api/delivery/drivers/live', {
    params: options.onlyLocated ? { only_located: true } : undefined,
    signal: options.signal,
  })
  return Array.isArray(data) ? data : []
}

/**
 * GET /api/delivery/assignments/{assignment_id}/route — the road taken with one order,
 * pickup to door; grows while the trip runs. Points oldest first, at most 300.
 * @param {number | string} assignmentId
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function getAssignmentRoute(assignmentId, options = {}) {
  const { data } = await apiClient.get(`/api/delivery/assignments/${assignmentId}/route`, {
    signal: options.signal,
  })
  return data
}
