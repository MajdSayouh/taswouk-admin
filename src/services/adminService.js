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
 * POST /api/accounts/admin/users/seller/{seller_id}/set-password
 * Sets a seller's password and revokes all of their existing sessions.
 *
 * @param {number | string} sellerId
 * @param {string} newPassword
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function setSellerPassword(sellerId, newPassword) {
  const { data } = await apiClient.post(`${resolveSellerByIdPath(sellerId)}/set-password`, {
    new_password: newPassword,
  })
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
 * Paginated shape the backend team agreed to return once pagination lands on the
 * admin users endpoints: a bounded page of rows plus enough info to page through
 * the rest (`total` record count, echoed `page`/`page_size`).
 * @typedef {{ items: unknown[], total: number, page: number, page_size: number }} PaginatedUserListSchema
 */

/**
 * GET /api/accounts/admin/users
 * @param {{ signal?: AbortSignal, page?: number, page_size?: number, params?: Record<string, unknown> }} [options]
 * @returns {Promise<UserListWithCountSchema | PaginatedUserListSchema>}
 */
export async function listAdminUsers(options = {}) {
  const { signal, page, page_size, params } = options
  const merged = { ...params }
  if (page != null) merged.page = page
  if (page_size != null) merged.page_size = page_size
  const { data } = await apiClient.get('/api/accounts/admin/users', {
    signal,
    params: Object.keys(merged).length ? merged : undefined,
  })
  return data
}

/**
 * GET /api/accounts/admin/users/role/{role}
 *
 * @param {'ADMIN' | 'CUSTOMER' | 'SELLER' | 'DELIVERY'} role
 * @param {{ signal?: AbortSignal, page?: number, page_size?: number, params?: Record<string, unknown> }} [options]
 * @returns {Promise<UserListWithCountSchema | PaginatedUserListSchema>}
 */
export async function listAdminUsersByRole(role, options = {}) {
  const { signal, page, page_size, params } = options
  const merged = { ...params }
  if (page != null) merged.page = page
  if (page_size != null) merged.page_size = page_size
  const { data } = await apiClient.get(`/api/accounts/admin/users/role/${role}`, {
    signal,
    params: Object.keys(merged).length ? merged : undefined,
  })
  return data
}
