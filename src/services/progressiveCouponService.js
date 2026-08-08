/**
 * Progressive Coupons API — admin endpoints only.
 * @see https://v2.taswouk.com/api/docs#/Progressive%20Coupons
 */
import { apiClient } from './apiClient.js'

const BASE = '/api/orders/progressive-coupons/admin/coupons'

/**
 * GET /api/orders/progressive-coupons/admin/coupons
 * @returns {Promise<unknown[]>}
 */
export async function listProgressiveCoupons(options = {}) {
  const { data } = await apiClient.get(BASE, { signal: options.signal })
  return data
}

/**
 * POST /api/orders/progressive-coupons/admin/coupons — CreateProgressiveCouponSchema
 * @param {{
 *   code: string
 *   tiers: Array<{ tier_number: number, min_amount: number, discount_amount: number }>
 * }} payload
 */
export async function createProgressiveCoupon(payload) {
  const { data } = await apiClient.post(BASE, payload)
  return data
}

/**
 * PATCH /api/orders/progressive-coupons/admin/coupons/{coupon_id} — UpdateProgressiveCouponSchema
 * @param {number | string} couponId
 * @param {{ is_active: boolean }} payload
 */
export async function updateProgressiveCoupon(couponId, payload) {
  const { data } = await apiClient.patch(`${BASE}/${couponId}`, payload)
  return data
}

/**
 * GET /api/orders/progressive-coupons/admin/coupons/{coupon_id}/stats
 * @param {number | string} couponId
 * @returns {Promise<unknown[]>}
 */
export async function getProgressiveCouponStats(couponId) {
  const { data } = await apiClient.get(`${BASE}/${couponId}/stats`)
  return data
}
