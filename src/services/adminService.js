/**
 * Admin accounts API (JWT must be an admin user).
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/** Override only if staging uses a different path (default matches OpenAPI). */
export function getCreateSellerPath() {
  const fromEnv = import.meta.env.VITE_ADMIN_CREATE_SELLER_PATH
  const trimmed = fromEnv && String(fromEnv).trim()
  return trimmed || '/api/accounts/admin/users/seller'
}

/** GET /api/accounts/admin/test */
export async function adminTest() {
  const { data } = await apiClient.get('/api/accounts/admin/test')
  return data
}

/**
 * POST /api/accounts/admin/users/seller — CreateSellerSchema; response UserProfileSchema.
 *
 * @param {{
 *   email: string
 *   password: string
 *   phone?: string | null
 *   first_name?: string | null
 *   last_name?: string | null
 * }} payload
 */
export async function createSeller(payload) {
  const { data } = await apiClient.post(getCreateSellerPath(), payload)
  return data
}

/** Override if backend exposes another seller list endpoint. */
export function getListSellersPath() {
  const fromEnv = import.meta.env.VITE_ADMIN_LIST_SELLERS_PATH
  const trimmed = fromEnv && String(fromEnv).trim()
  return trimmed || '/api/accounts/admin/users/sellers'
}

/**
 * GET sellers for admin dropdowns.
 * Tries configured path first, then falls back to common user listing route with role filter.
 *
 * @returns {Promise<unknown[]>}
 */
export async function listSellers(options = {}) {
  try {
    const { data } = await apiClient.get(getListSellersPath(), { signal: options.signal })
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.items)) return data.items
    return []
  } catch (err) {
    const status = err?.status ?? err?.response?.status
    if (status && status !== 404) throw err
    const { data } = await apiClient.get('/api/accounts/admin/users', {
      params: { role: 'SELLER' },
      signal: options.signal,
    })
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.items)) return data.items
    return []
  }
}

function resolveSellerByIdPath(sellerId) {
  const tpl =
    String(import.meta.env.VITE_ADMIN_SELLER_BY_ID_PATH_TEMPLATE || '').trim() ||
    '/api/accounts/admin/users/seller/{sellerId}'
  const path = tpl.replace(/\{sellerId\}/g, String(sellerId))
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * PUT /api/accounts/admin/users/seller/{seller_id} — UpdateSellerSchema.
 *
 * @param {number | string} sellerId
 * @param {{
 *   email?: string | null
 *   phone?: string | null
 *   first_name?: string | null
 *   last_name?: string | null
 *   is_active?: boolean | null
 *   is_verified?: boolean | null
 * }} payload
 */
export async function updateSeller(sellerId, payload) {
  const { data } = await apiClient.put(resolveSellerByIdPath(sellerId), payload)
  return data
}

/**
 * DELETE /api/accounts/admin/users/seller/{seller_id}
 * @param {number | string} sellerId
 */
export async function deleteSeller(sellerId) {
  await apiClient.delete(resolveSellerByIdPath(sellerId))
}

/** @typedef {{ points_per_amount: number }} PointsSettingsSchema */

/**
 * GET /api/accounts/admin/points/settings
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<PointsSettingsSchema>}
 */
export async function getPointsSettings(options = {}) {
  const { data } = await apiClient.get('/api/accounts/admin/points/settings', {
    signal: options.signal,
  })
  return data
}

/**
 * PUT /api/accounts/admin/points/settings
 * @param {{ points_per_amount: number }} payload
 * @returns {Promise<PointsSettingsSchema>}
 */
export async function updatePointsSettings(payload) {
  const { data } = await apiClient.put('/api/accounts/admin/points/settings', payload)
  return data
}

/** @typedef {{ exchange_rate: number }} ExchangeRateSettingsSchema */

/**
 * PUT /api/exchange-rate
 * @param {{ exchange_rate: number }} payload
 * @returns {Promise<ExchangeRateSettingsSchema>}
 */
export async function updateExchangeRateSettings(payload) {
  const { data } = await apiClient.put('/api/exchange-rate', payload)
  return data
}

/** @typedef {{ count: number, users: unknown[] }} UserListWithCountSchema */

/**
 * GET /api/accounts/admin/users
 * @param {{ signal?: AbortSignal, params?: Record<string, unknown> }} [options]
 * @returns {Promise<UserListWithCountSchema>}
 */
export async function listAdminUsers(options = {}) {
  const { signal, params } = options
  const { data } = await apiClient.get('/api/accounts/admin/users', {
    signal,
    params: params && Object.keys(params).length ? params : undefined,
  })
  return data
}

/**
 * GET /api/accounts/admin/users/role/{role}
 *
 * @param {'ADMIN' | 'CUSTOMER' | 'SELLER' | 'DELIVERY'} role
 * @param {{ signal?: AbortSignal, params?: Record<string, number> }} [options]
 *   `params` lets the caller try different pagination query-param conventions
 *   (e.g. `{ page, page_size }` vs `{ offset, limit }`) since the exact one
 *   this backend honors isn't confirmed.
 * @returns {Promise<UserListWithCountSchema>}
 */
export async function listAdminUsersByRole(role, options = {}) {
  const { signal, params } = options
  const { data } = await apiClient.get(`/api/accounts/admin/users/role/${role}`, {
    signal,
    params: params && Object.keys(params).length ? params : undefined,
  })
  return data
}
