/**
 * Coupons API — list, create, update, delete, validate.
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/**
 * GET /api/orders/coupons
 * @returns {Promise<unknown[]>}
 */
export async function listCoupons(options = {}) {
  const { data } = await apiClient.get('/api/orders/coupons', { signal: options.signal })
  return data
}

/**
 * POST /api/orders/coupons
 * @param {{
 *   code: string
 *   name: string
 *   discount_percent: number
 *   max_uses?: number | null
 *   expires_at?: string | null
 *   is_active?: boolean
 * }} payload
 */
export async function createCoupon(payload) {
  const { data } = await apiClient.post('/api/orders/coupons', payload)
  return data
}

/**
 * PATCH /api/orders/coupons/{coupon_id}
 * @param {number | string} couponId
 * @param {Record<string, unknown>} payload
 */
export async function updateCoupon(couponId, payload) {
  const { data } = await apiClient.patch(`/api/orders/coupons/${couponId}`, payload)
  return data
}

/**
 * DELETE /api/orders/coupons/{coupon_id}
 * @param {number | string} couponId
 */
export async function deleteCoupon(couponId) {
  await apiClient.delete(`/api/orders/coupons/${couponId}`)
}

/**
 * POST /api/orders/coupons/validate
 * @param {{ code: string }} payload
 */
export async function validateCoupon(payload) {
  const { data } = await apiClient.post('/api/orders/coupons/validate', payload)
  return data
}
