/**
 * Stores API — list, create, update, delete, toggle active, brand flag.
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

function isFileLike(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    ((typeof File !== 'undefined' && value instanceof File) ||
      (typeof Blob !== 'undefined' && value instanceof Blob))
  )
}

function toMultipart(payload) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(payload || {})) {
    if (value === undefined || value === null) continue
    if (isFileLike(value)) {
      fd.append(key, value)
      continue
    }
    fd.append(key, String(value))
  }
  return fd
}

function multipartConfig() {
  return {
    transformRequest: [
      (body, headers) => {
        if (body instanceof FormData) {
          delete headers['Content-Type']
        }
        return body
      },
    ],
  }
}

function shouldUseMultipart(payload) {
  return isFileLike(payload?.logo)
}

/**
 * GET /api/stores/
 * @returns {Promise<unknown[]>}
 */
export async function listStores() {
  const { data } = await apiClient.get('/api/stores/')
  return data
}

/**
 * GET /api/stores/public
 * @returns {Promise<unknown[]>}
 */
export async function listPublicStores() {
  const { data } = await apiClient.get('/api/stores/public')
  return data
}

/**
 * GET /api/stores/{store_id}
 * @param {number | string} storeId
 */
export async function getStore(storeId) {
  const { data } = await apiClient.get(`/api/stores/${storeId}`)
  return data
}

/**
 * POST /api/stores/admin/create — StoreCreateByAdminSchema (admin JWT; `seller_id` required).
 * @param {{
 *   seller_id: number
 *   name: string
 *   description?: string | null
 *   phone?: string | null
 *   address?: string | null
 *   latitude?: number | null
 *   longitude?: number | null
 *   logo?: File | Blob | null
 * }} payload
 */
export async function adminCreateStore(payload) {
  const body = shouldUseMultipart(payload) ? toMultipart(payload) : payload
  const { data } = await apiClient.post('/api/stores/admin/create', body, multipartConfig())
  return data
}

/**
 * POST /api/stores/my/create — StoreCreateBySellerSchema (seller JWT; `name` required).
 * @param {{
 *   name: string
 *   description?: string | null
 *   phone?: string | null
 *   address?: string | null
 *   latitude?: number | null
 *   longitude?: number | null
 *   logo?: File | Blob | null
 * }} payload
 */
export async function sellerCreateStore(payload) {
  const body = shouldUseMultipart(payload) ? toMultipart(payload) : payload
  const { data } = await apiClient.post('/api/stores/my/create', body, multipartConfig())
  return data
}

/**
 * PUT /api/stores/{store_id}
 * @param {number | string} storeId
 * @param {{
 *   name?: string | null
 *   phone?: string | null
 *   address?: string | null
 *   description?: string | null
 *   latitude?: number | null
 *   longitude?: number | null
 *   logo?: File | Blob | null
 * }} payload
 */
export async function updateStore(storeId, payload) {
  const body = shouldUseMultipart(payload) ? toMultipart(payload) : payload
  const { data } = await apiClient.put(`/api/stores/${storeId}`, body, multipartConfig())
  return data
}

/**
 * DELETE /api/stores/{store_id}
 * @param {number | string} storeId
 */
export async function deleteStore(storeId) {
  await apiClient.delete(`/api/stores/${storeId}`)
}

/**
 * PATCH /api/stores/{store_id}/toggle-active
 * @param {number | string} storeId
 * @param {boolean} isActive
 */
export async function toggleStoreActive(storeId, isActive) {
  const { data } = await apiClient.patch(`/api/stores/${storeId}/toggle-active`, {
    is_active: isActive,
  })
  return data
}

/**
 * PATCH /api/stores/{store_id}/set-brand
 * @param {number | string} storeId
 * @param {boolean} isBrand
 */
export async function setStoreBrand(storeId, isBrand) {
  const { data } = await apiClient.patch(`/api/stores/${storeId}/set-brand`, {
    is_brand: isBrand,
  })
  return data
}

/**
 * GET /api/stores/public/{store_id}
 * @param {number | string} storeId
 */
export async function getPublicStore(storeId) {
  const { data } = await apiClient.get(`/api/stores/public/${storeId}`)
  return data
}
