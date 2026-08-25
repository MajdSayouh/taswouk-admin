/**
 * Product Moderation Service — **Product moderation queue** API (`/api/products/moderation/`).
 * All routes require the ADMIN role. See `product-moderation-dashboard-spec.md` for the full
 * contract this mirrors.
 * @see https://test.taswouk.com/api/docs — "Moderation"
 */
import { apiClient } from './apiClient.js'

/**
 * @typedef {Object} ModerationPendingChanges
 * @property {string} [name]
 * @property {string} [description]
 * @property {number} [category_id]
 */

/**
 * @typedef {Object} ModerationQueueItem
 * @property {number} id
 * @property {string} name
 * @property {number} store_id
 * @property {string} store_name
 * @property {number} price
 * @property {string} category
 * @property {string} description
 * @property {string[]} images
 * @property {'PENDING' | 'APPROVED' | 'REJECTED'} moderation_status
 * @property {string} rejection_reason
 * @property {boolean} has_pending_changes
 * @property {ModerationPendingChanges | null} pending_changes
 * @property {string} submitted_at
 * @property {string} created_at
 */

/**
 * GET /api/products/moderation/queue
 * `status=PENDING` (default) returns both not-yet-reviewed products AND already-approved
 * products carrying a pending edit — both genuinely await a decision. Don't assume PENDING-status
 * rows are the only ones returned for the default filter.
 * @param {{ status?: 'PENDING'|'APPROVED'|'REJECTED'|'ALL', store_id?: number, search?: string, page?: number, limit?: number }} [params]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ items: ModerationQueueItem[], count: number, pending_count: number }>}
 */
export async function getModerationQueue(params = {}, options = {}) {
  const { data } = await apiClient.get('/api/products/moderation/queue', {
    params,
    signal: options.signal,
  })
  return data
}

/**
 * POST /api/products/moderation/{id}/approve — no body.
 * @param {number | string} productId
 * @returns {Promise<ModerationQueueItem>}
 */
export async function approveModerationProduct(productId) {
  const { data } = await apiClient.post(`/api/products/moderation/${productId}/approve`, {})
  return data
}

/**
 * POST /api/products/moderation/{id}/reject — `reason` is required; empty/whitespace-only → 400.
 * @param {number | string} productId
 * @param {string} reason
 * @returns {Promise<ModerationQueueItem>}
 */
export async function rejectModerationProduct(productId, reason) {
  const { data } = await apiClient.post(`/api/products/moderation/${productId}/reject`, {
    reason,
  })
  return data
}

/**
 * POST /api/products/moderation/bulk-approve
 * @param {(number | string)[]} productIds
 * @returns {Promise<{ updated: number, skipped: (number | string)[] }>}
 */
export async function bulkApproveModerationProducts(productIds) {
  const { data } = await apiClient.post('/api/products/moderation/bulk-approve', {
    product_ids: productIds,
  })
  return data
}

/**
 * POST /api/products/moderation/bulk-reject
 * @param {(number | string)[]} productIds
 * @param {string} reason
 * @returns {Promise<{ updated: number, skipped: (number | string)[] }>}
 */
export async function bulkRejectModerationProducts(productIds, reason) {
  const { data } = await apiClient.post('/api/products/moderation/bulk-reject', {
    product_ids: productIds,
    reason,
  })
  return data
}
