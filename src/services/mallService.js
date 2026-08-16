/**
 * Malls API (admin) — Moll entity + product assignments.
 * @see https://test.taswouk.com/api/docs#/Malls
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

/**
 * GET /api/malls/
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ count: number, malls: unknown[] }>}
 */
export async function listMalls(options = {}) {
  const { data } = await apiClient.get('/api/malls/', { signal: options.signal })
  if (data && typeof data === 'object' && Array.isArray(data.malls)) {
    return { count: Number(data.count) || data.malls.length, malls: data.malls }
  }
  if (Array.isArray(data)) {
    return { count: data.length, malls: data }
  }
  return { count: 0, malls: [] }
}

/**
 * GET /api/malls/{moll_id}
 * @param {number | string} mallId
 */
export async function getMall(mallId) {
  const { data } = await apiClient.get(`/api/malls/${mallId}`)
  return data
}

/**
 * POST /api/malls/ — MollCreateSchema (admin)
 * @param {Record<string, unknown>} payload
 */
export async function createMall(payload) {
  const { data } = await apiClient.post('/api/malls/', payload)
  return data
}

/**
 * PUT /api/malls/{moll_id} — MollUpdateSchema
 * @param {number | string} mallId
 * @param {Record<string, unknown>} payload
 */
export async function updateMall(mallId, payload) {
  const { data } = await apiClient.put(`/api/malls/${mallId}`, payload)
  return data
}

/**
 * PUT /api/malls/{moll_id}/exchange-rate — MollExchangeRateSchema (admin).
 * `null` clears the mall override and falls back to the system exchange rate.
 * @param {number | string} mallId
 * @param {number | null} exchangeRate
 */
export async function setMallExchangeRate(mallId, exchangeRate) {
  const { data } = await apiClient.put(`/api/malls/${mallId}/exchange-rate`, {
    exchange_rate: exchangeRate,
  })
  return data
}

/**
 * DELETE /api/malls/{moll_id}
 * @param {number | string} mallId
 */
export async function deleteMall(mallId) {
  await apiClient.delete(`/api/malls/${mallId}`)
}

/**
 * PATCH /api/malls/{moll_id}/toggle-active
 * @param {number | string} mallId
 */
export async function toggleMallActive(mallId) {
  const { data } = await apiClient.patch(`/api/malls/${mallId}/toggle-active`)
  return data
}

/**
 * POST /api/malls/{moll_id}/logo — multipart `file`
 * @param {number | string} mallId
 * @param {File | Blob} file
 */
export async function uploadMallLogo(mallId, file) {
  if (!isFileLike(file)) throw new Error('Logo must be a file')
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await apiClient.post(`/api/malls/${mallId}/logo`, fd, multipartConfig())
  return data
}

/**
 * DELETE /api/malls/{moll_id}/logo
 * @param {number | string} mallId
 */
export async function deleteMallLogo(mallId) {
  const { data } = await apiClient.delete(`/api/malls/${mallId}/logo`)
  return data
}

// ——— Mall product assignments (admin) ———

/**
 * GET /api/malls/{moll_id}/products — PagedMollProductOutSchema ({ items, count }).
 * Confirmed paginated: `page` (default 1) and `page_size`.
 * @param {number | string} mallId
 * @param {{ signal?: AbortSignal, page?: number, pageSize?: number }} [options]
 */
export async function listMallProducts(mallId, options = {}) {
  const { signal, page = 1, pageSize } = options
  const { data } = await apiClient.get(`/api/malls/${mallId}/products`, {
    signal,
    params: { page, page_size: pageSize || undefined },
  })
  const products = extractMallProductsList(data)
  const total = Number(data?.count ?? data?.total) || products.length
  return { count: total, total, products }
}

/**
 * The exact wrapper key the backend uses for this list isn't confirmed (we've hit this same
 * kind of mismatch on other admin list endpoints), so accept any of the common shapes rather
 * than assuming `{ items: [...] }` and silently returning an empty list otherwise.
 */
function extractMallProductsList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  for (const key of ['items', 'products', 'results', 'assignments', 'moll_products', 'data']) {
    if (Array.isArray(data[key])) return data[key]
  }
  return []
}

/**
 * GET /api/malls/public/search — scoped to one mall via `moll_id`, with real text search
 * (`q`) and pagination (`page`/`limit`). Used to search a mall's assigned products without
 * pulling every page down to filter client-side.
 * @param {number | string} mallId
 * @param {{ q?: string, page?: number, limit?: number, signal?: AbortSignal }} [options]
 */
export async function searchMallProducts(mallId, options = {}) {
  const { q, page = 1, limit = 20, signal } = options
  const { data } = await apiClient.get('/api/malls/public/search', {
    signal,
    params: { moll_id: mallId, q: q || undefined, page, limit },
  })
  const products = Array.isArray(data?.products) ? data.products : []
  const total = Number(data?.total_products) || products.length
  return { count: total, total, products }
}

/**
 * POST /api/malls/{moll_id}/products — MollProductAssignSchema
 * @param {number | string} mallId
 * @param {{ product_id: number, price: number }} payload
 */
export async function assignProductToMall(mallId, payload) {
  const { data } = await apiClient.post(`/api/malls/${mallId}/products`, payload)
  return data
}

/**
 * PUT /api/malls/{moll_id}/products/{product_id} — MollProductUpdateSchema
 * @param {number | string} mallId
 * @param {number | string} productId
 * @param {{ price?: number | null, is_available?: boolean | null }} payload
 */
export async function updateMallProduct(mallId, productId, payload) {
  const { data } = await apiClient.put(`/api/malls/${mallId}/products/${productId}`, payload)
  return data
}

/**
 * DELETE /api/malls/{moll_id}/products/{product_id}
 * @param {number | string} mallId
 * @param {number | string} productId
 */
export async function removeProductFromMall(mallId, productId) {
  await apiClient.delete(`/api/malls/${mallId}/products/${productId}`)
}
