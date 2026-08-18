/**
 * Stores API — list, create, update, delete, toggle active, brand flag.
 * @see https://v2.taswouk.com/api/docs#/Stores%20Admin
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
export async function listStores(options = {}) {
  const { data } = await apiClient.get('/api/stores/', { signal: options.signal })
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
 * POST /api/stores/admin/create-with-logo — multipart/form-data (admin JWT).
 * Fields: seller_id, name, description?, phone?, address?, latitude?, longitude?, exchange_rate?, is_active?, logo? (binary).
 *
 * `is_active` is sent explicitly (default `true` from the create form) — without it, a store
 * created here stayed invisible on GET /api/stores/public until someone separately called
 * toggleStoreActive, which was easy to forget and the actual cause of "I created a store but it
 * doesn't show on the site" reports.
 *
 * @param {{
 *   seller_id: number
 *   name: string
 *   description?: string | null
 *   phone?: string | null
 *   address?: string | null
 *   latitude?: number | null
 *   longitude?: number | null
 *   exchange_rate?: number | null
 *   currency?: 'USD' | 'SYP' | null
 *   store_type?: 'syrian' | 'grocery' | 'global' | 'restaurant' | null
 *   start_working_at?: string | null
 *   end_working_at?: string | null
 *   preparation_time?: number | null
 *   is_active?: boolean
 *   logo?: File | Blob | null
 * }} payload
 */
export async function adminCreateStore(payload) {
  const body = toMultipart({
    seller_id: payload.seller_id,
    name: payload.name,
    description: payload.description,
    phone: payload.phone,
    address: payload.address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    currency: payload.currency,
    exchange_rate: payload.exchange_rate,
    store_type: payload.store_type,
    start_working_at: payload.start_working_at,
    end_working_at: payload.end_working_at,
    preparation_time: payload.preparation_time,
    is_active: payload.is_active,
    logo: payload.logo,
  })
  const { data } = await apiClient.post('/api/stores/admin/create-with-logo', body, multipartConfig())
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
 *   exchange_rate?: number | null
 *   is_active?: boolean
 *   logo?: File | Blob | null
 * }} payload
 */
export async function sellerCreateStore(payload) {
  const body = shouldUseMultipart(payload) ? toMultipart(payload) : payload
  const { data } = await apiClient.post('/api/stores/my/create', body, multipartConfig())
  return data
}

/**
 * PUT /api/stores/{store_id} — JSON only (`StoreUpdateSchema` has no file or exchange-rate fields).
 * Do not send `logo` here; use {@link patchStoreLogo} after updating fields.
 * @param {number | string} storeId
 * @param {{
 *   name?: string | null
 *   phone?: string | null
 *   address?: string | null
 *   description?: string | null
 *   latitude?: number | null
 *   longitude?: number | null
 *   currency?: 'USD' | 'SYP' | null
 *   start_working_at?: string | null
 *   end_working_at?: string | null
 *   preparation_time?: number | null
 * }} payload
 */
export async function updateStore(storeId, payload) {
  const clean = { ...(payload || {}) }
  delete clean.logo
  // Per-store exchange rates have a dedicated admin endpoint. Sending this field to the general
  // update endpoint is silently ignored by the API.
  delete clean.exchange_rate
  const { data } = await apiClient.put(`/api/stores/${storeId}`, clean)
  return data
}

/**
 * PUT /api/stores/{store_id}/exchange-rate — `Stores Admin` per-store rate override.
 * Pass null to make the store use the system-wide exchange rate.
 * @param {number | string} storeId
 * @param {number | null} exchangeRate
 */
export async function updateStoreExchangeRate(storeId, exchangeRate) {
  const { data } = await apiClient.put(`/api/stores/${storeId}/exchange-rate`, {
    exchange_rate: exchangeRate,
  })
  return data
}

/**
 * PATCH /api/stores/{store_id}/logo — multipart `logo` (binary).
 * @param {number | string} storeId
 * @param {File | Blob} logoFile
 */
export async function patchStoreLogo(storeId, logoFile) {
  if (!isFileLike(logoFile)) {
    throw new Error('Logo must be a file')
  }
  const body = toMultipart({ logo: logoFile })
  const { data } = await apiClient.patch(`/api/stores/${storeId}/logo`, body, multipartConfig())
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
 * PATCH /api/stores/{store_id}/toggle-brand — flips `is_brand` (no request body).
 * @param {number | string} storeId
 */
export async function toggleStoreBrand(storeId) {
  const { data } = await apiClient.patch(`/api/stores/${storeId}/toggle-brand`)
  return data
}

/**
 * PATCH /api/stores/{store_id}/set-type — admin only.
 * @param {number | string} storeId
 * @param {'syrian' | 'grocery' | 'global' | 'restaurant'} storeType
 */
export async function setStoreType(storeId, storeType) {
  const { data } = await apiClient.patch(`/api/stores/${storeId}/set-type`, {
    store_type: storeType,
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
