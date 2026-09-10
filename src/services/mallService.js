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
 * GET /api/malls/{moll_id}/prices/export — Excel file of this mall's assigned product prices.
 * @param {number | string} mallId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Blob>}
 */
export async function exportMallPrices(mallId, options = {}) {
  const { data, headers } = await apiClient.get(`/api/malls/${mallId}/prices/export`, {
    responseType: 'blob',
    skipGlobalErrorMessage: true,
    signal: options.signal,
  })
  if (!(data instanceof Blob)) throw new Error('Invalid export response')
  const type = data.type || ''
  // Errors can come back as a JSON/HTML body mislabeled by responseType: 'blob'.
  if (type.includes('application/json') || type.includes('text/html') || type.includes('text/plain')) {
    const text = await data.text()
    let msg = text.slice(0, 200)
    try {
      const j = JSON.parse(text)
      if (typeof j.detail === 'string') msg = j.detail
      else if (typeof j.message === 'string') msg = j.message
    } catch {
      /* keep truncated body */
    }
    throw new Error(msg || 'Could not export mall prices')
  }
  if (data.size === 0) throw new Error('Empty export response')
  const disposition = String(headers?.['content-disposition'] ?? '')
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : null
  return { blob: data, filename }
}

/**
 * POST /api/malls/{moll_id}/prices/import — multipart `file` (Excel) to bulk-update this mall's
 * assigned product prices. Response schema isn't documented on the API — callers should just show
 * a generic success/failure and refetch the mall's product list afterward.
 * @param {number | string} mallId
 * @param {File | Blob} file
 */
export async function importMallPrices(mallId, file) {
  if (!isFileLike(file)) throw new Error('File must be a file')
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await apiClient.post(`/api/malls/${mallId}/prices/import`, fd, multipartConfig())
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
 * POST /api/malls/{moll_id}/products — MollProductCreateSchema
 *
 * Creates a product the mall owns. This used to take a `product_id` picked from
 * a shared catalogue and attach a price to it; the catalogue is gone, so the
 * full product is sent instead — the same shape a store product is created in.
 * @param {number | string} mallId
 * @param {{ name: string, price: number, description?: string, category_id?: number | null,
 *           stock_quantity?: number, track_stock?: boolean, is_active?: boolean }} payload
 */
export async function createMallProduct(mallId, payload) {
  const { data } = await apiClient.post(`/api/malls/${mallId}/products`, payload)
  return data
}

/**
 * PUT /api/malls/{moll_id}/products/{product_id} — MollProductUpdateSchema
 *
 * `productId` is the mall product's own id. It named the shared catalogue row
 * before, which is why editing a name here changed it for every mall stocking
 * the item; now name, description and category belong to this mall alone.
 *
 * Omit a field to leave it; send `category_id: null` to clear the category.
 * @param {number | string} mallId
 * @param {number | string} productId
 * @param {{ price?: number, is_available?: boolean, stock_quantity?: number,
 *           track_stock?: boolean, name?: string, description?: string,
 *           category_id?: number | null, is_active?: boolean }} payload
 */
export async function updateMallProduct(mallId, productId, payload) {
  const { data } = await apiClient.put(`/api/malls/${mallId}/products/${productId}`, payload)
  return data
}

/**
 * POST /api/malls/{moll_id}/products/{product_id}/images — multipart, field `files`.
 *
 * Images belong to the mall's product now. They hung off the shared catalogue
 * row before, so every mall selling an item showed the same photo and none
 * could replace it.
 * @param {number | string} mallId
 * @param {number | string} productId
 * @param {File[]} files
 * @param {{ featuredIndex?: number }} [options]
 */
export async function uploadMallProductImages(mallId, productId, files, options = {}) {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  const { featuredIndex } = options
  const { data } = await apiClient.post(
    `/api/malls/${mallId}/products/${productId}/images`,
    form,
    { params: featuredIndex == null ? undefined : { featured_index: featuredIndex } },
  )
  return data
}

/**
 * PATCH /api/malls/{moll_id}/products/{product_id}/images/{image_id}/set-featured
 */
export async function setFeaturedMallProductImage(mallId, productId, imageId) {
  const { data } = await apiClient.patch(
    `/api/malls/${mallId}/products/${productId}/images/${imageId}/set-featured`,
  )
  return data
}

/**
 * DELETE /api/malls/{moll_id}/products/{product_id}/images/{image_id}
 *
 * Deleting the featured image promotes another server-side, so the card does
 * not go blank while the product still has pictures.
 */
export async function deleteMallProductImage(mallId, productId, imageId) {
  await apiClient.delete(`/api/malls/${mallId}/products/${productId}/images/${imageId}`)
}

/**
 * DELETE /api/malls/{moll_id}/products/{product_id}
 * @param {number | string} mallId
 * @param {number | string} productId
 */
export async function removeProductFromMall(mallId, productId) {
  await apiClient.delete(`/api/malls/${mallId}/products/${productId}`)
}
