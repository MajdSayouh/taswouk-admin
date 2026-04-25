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
export async function listSellers() {
  try {
    const { data } = await apiClient.get(getListSellersPath())
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.items)) return data.items
    return []
  } catch (err) {
    const status = err?.status ?? err?.response?.status
    if (status && status !== 404) throw err
    const { data } = await apiClient.get('/api/accounts/admin/users', {
      params: { role: 'SELLER' },
    })
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    if (Array.isArray(data?.items)) return data.items
    return []
  }
}
