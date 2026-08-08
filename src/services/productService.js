/**
 * Product Service — **Products** API (`/api/products/`, Jomran).
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'
import { extractProductImageStoragePath, getProductImageApiPath } from '../utils/mediaUrl.js'
import {
  logStrippedProductWriteFields,
  sanitizeProductWritePayload,
} from '../utils/productWritePayload.js'
import { parseVariantIdFromDto, variantStatusForApiRow } from '../utils/productVariants.js'

function waitForRetry(delayMs) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delayMs))
}

const VARIANT_REQUEST_MIN_INTERVAL_MS = 200
let variantRequestQueue = Promise.resolve()
let lastVariantRequestStartedAt = 0

/** Serialize variant endpoints and keep a small gap so generated combinations do not burst. */
function scheduleVariantRequest(request) {
  const scheduled = variantRequestQueue.catch(() => undefined).then(async () => {
    const elapsed = Date.now() - lastVariantRequestStartedAt
    const remaining = VARIANT_REQUEST_MIN_INTERVAL_MS - elapsed
    if (remaining > 0) await waitForRetry(remaining)
    lastVariantRequestStartedAt = Date.now()
    return request()
  })
  variantRequestQueue = scheduled.then(
    () => undefined,
    () => undefined,
  )
  return scheduled
}

/** Retry only requests the API explicitly rejected before processing with HTTP 429. */
async function retryRateLimitedVariantRequest(request, maxRetries = 3) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await scheduleVariantRequest(request)
    } catch (err) {
      if (err?.status !== 429 || attempt >= maxRetries) throw err
      await waitForRetry(750 * (2 ** attempt))
    }
  }
}

/**
 * @typedef {Object} ProductDto
 * @property {number} id
 * @property {number} store_id
 * @property {string} name
 * @property {string | null} [description]
 * @property {number} price
 * @property {boolean} is_active
 * @property {unknown[]} [images]
 * @property {string} created_at
 */

/**
 * GET /api/products/
 * @param {Record<string, unknown>} [params] — optional query string (e.g. pagination) if the API supports it
 * @returns {Promise<ProductDto[] | { results?: ProductDto[], count?: number }>}
 */
export async function getProducts(params, options = {}) {
  const { data } = await apiClient.get('/api/products/', {
    params: params || undefined,
    signal: options.signal,
  })
  return data
}

function normalizePublicProductParams(params = {}) {
  const { page_size: pageSize, ...rest } = params
  return {
    ...rest,
    ...(pageSize != null && pageSize !== '' ? { limit: pageSize } : {}),
  }
}

/**
 * GET /api/products/public
 * Public catalog list. The v2 API names its page-size parameter `limit`.
 *
 * @param {Record<string, unknown>} [params]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<ProductDto[]>}
 */
export async function getPublicProducts(params, options = {}) {
  const { data } = await apiClient.get('/api/products/public', {
    params: normalizePublicProductParams(params),
    signal: options.signal,
    skipAuthHeader: true,
  })
  return data
}

/**
 * GET /api/products/public/search
 * Uses the v2 unified products search endpoint and returns its raw response shape.
 *
 * @param {{
 *   q: string
 *   name?: string | null
 *   store_id?: number | null
 *   category?: string | null
 *   sub_category?: string | null
 *   category_id?: number | null
 *   min_price?: number | null
 *   max_price?: number | null
 *   color?: string | null
 *   size?: string | null
 *   is_offer?: boolean | null
 *   brand_only?: boolean
 *   sort?: string | null
 * }} params
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function searchPublicProducts(params, options = {}) {
  const { data } = await apiClient.get('/api/products/public/search', {
    params: normalizePublicProductParams(params),
    signal: options.signal,
    skipAuthHeader: true,
  })
  return data
}

/**
 * GET /api/products/{product_id}
 * @param {number | string} productId
 * @returns {Promise<ProductDto>}
 */
export async function getProductById(productId) {
  const { data } = await apiClient.get(`/api/products/${productId}`)
  return data
}

/**
 * POST /api/products/ — ProductCreateSchema
 * @param {{
 *   store_id: number
 *   name: string
 *   category_id?: number | null
 *   size?: string[]
 *   colors?: string[] | string | null
 *   description?: string | null
 *   price?: number
 *   is_offer?: boolean
 *   new_price?: number | null
 *   rate?: number
 *   is_active?: boolean
 * }} payload
 * @returns {Promise<ProductDto>}
 */
export async function createProduct(payload) {
  const { data } = await apiClient.post('/api/products/', sanitizeProductWritePayload(payload))
  return data
}

/**
 * PUT /api/products/{product_id} — ProductUpdateSchema
 * @param {number | string} productId
 * @param {{
 *   name?: string | null
 *   category_id?: number | null
 *   size?: string[] | null
 *   colors?: string[] | string | null
 *   description?: string | null
 *   price?: number | null
 *   is_offer?: boolean | null
 *   new_price?: number | null
 *   rate?: number | null
 *   is_active?: boolean | null
 * }} payload
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<ProductDto>}
 */
export async function updateProduct(productId, payload, options = {}) {
  if (payload && typeof payload === 'object') {
    logStrippedProductWriteFields(/** @type {Record<string, unknown>} */ (payload))
  }
  const body = sanitizeProductWritePayload(payload)
  if (import.meta.env.DEV && body && typeof body === 'object' && 'category' in body) {
    console.error('[products] Refusing to send forbidden field "category" on PUT', body)
    delete body.category
  }
  const { data } = await apiClient.put(`/api/products/${productId}`, body, {
    signal: options.signal,
  })
  return data
}

export { sanitizeProductWritePayload } from '../utils/productWritePayload.js'

/**
 * DELETE /api/products/{product_id}
 * @param {number | string} productId
 */
export async function deleteProduct(productId) {
  await apiClient.delete(`/api/products/${productId}`)
}

/**
 * GET product image with JWT (required when the URL returns 401 without `Authorization`).
 * Uses the same path rules as `getProductImageApiPath` in `mediaUrl.js`.
 *
 * @param {unknown} pathOrUrl — stored `image` field or full URL
 * @returns {Promise<Blob>}
 */
export async function fetchProductImageBlob(pathOrUrl, options = {}) {
  const path = getProductImageApiPath(pathOrUrl, options)
  if (!path) {
    throw new Error('Invalid product image path')
  }
  const { signal } = options
  const { data } = await apiClient.get(path, {
    responseType: 'blob',
    skipGlobalErrorMessage: true,
    skipAuthLogout: true,
    signal,
  })

  if (!(data instanceof Blob)) {
    throw new Error('Invalid image response')
  }

  const type = data.type || ''
  // Mis-labelled JSON/HTML error bodies when using responseType: 'blob'
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
    throw new Error(msg || 'Could not load image')
  }

  if (data.size === 0) {
    throw new Error('Empty image response')
  }

  return data
}

/** @type {Map<string, string>} */
const productImageBlobUrlCache = new Map()
/** @type {Map<string, Promise<string>>} */
const productImageBlobInflight = new Map()

/**
 * Cached object URL for product thumbnails (dedupes list/detail concurrent loads).
 *
 * @param {unknown} pathOrUrl
 * @param {{ productId?: string | number, signal?: AbortSignal }} [options]
 * @returns {Promise<string>}
 */
export async function fetchProductImageBlobUrl(pathOrUrl, options = {}) {
  const path = getProductImageApiPath(pathOrUrl, options)
  if (!path) {
    throw new Error('Invalid product image path')
  }

  const cached = productImageBlobUrlCache.get(path)
  if (cached) return cached

  let pending = productImageBlobInflight.get(path)
  if (!pending) {
    pending = (async () => {
      const blob = await fetchProductImageBlob(pathOrUrl, options)
      const url = URL.createObjectURL(blob)
      productImageBlobUrlCache.set(path, url)
      productImageBlobInflight.delete(path)
      return url
    })()
    productImageBlobInflight.set(path, pending)
  }

  try {
    return await pending
  } catch (err) {
    productImageBlobInflight.delete(path)
    throw err
  }
}

/** Drop cached blob URLs after product image mutations. */
export function invalidateProductImageBlobCache() {
  for (const url of productImageBlobUrlCache.values()) {
    URL.revokeObjectURL(url)
  }
  productImageBlobUrlCache.clear()
  productImageBlobInflight.clear()
}

function resolveProductImagesUploadUrl(productId) {
  const pathTpl =
    String(import.meta.env.VITE_PRODUCT_IMAGE_UPLOAD_PATH_TEMPLATE || '').trim() ||
    '/api/products/{id}/images'
  if (pathTpl.includes('{id}')) {
    return pathTpl.replace(/\{id\}/g, String(productId))
  }
  return `/api/products/${productId}/images`
}

/** Multipart field name expected by OpenAPI (FastAPI typically uses the parameter name `images`). */
function imageFormFieldName() {
  const name = String(import.meta.env.VITE_PRODUCT_IMAGE_FORM_FIELD || '').trim()
  return name || 'images'
}

/**
 * POST `/api/products/{product_id}/images` — multipart (`images` files). Optional query `featured_index`.
 *
 * @param {number | string} productId
 * @param {File[]} files
 * @param {{ featuredIndex?: number | null }} [options]
 */
export async function uploadProductImages(productId, files, options = {}) {
  if (!files?.length) return

  const formData = new FormData()
  const field = imageFormFieldName()
  for (let i = 0; i < files.length; i++) {
    formData.append(field, files[i])
  }

  const url = resolveProductImagesUploadUrl(productId)
  const params = {}
  if (options.featuredIndex != null && Number.isFinite(Number(options.featuredIndex))) {
    params.featured_index = Number(options.featuredIndex)
  }

  const { data } = await apiClient.post(url, formData, {
    params: Object.keys(params).length ? params : undefined,
    transformRequest: [
      (payload, headers) => {
        if (payload instanceof FormData) {
          delete headers['Content-Type']
        }
        return payload
      },
    ],
  })
  return data
}

/**
 * Storage paths from `POST /api/products/{id}/images` response (`ProductImagesUploadOutSchema`).
 * @param {unknown} data
 * @returns {string[]}
 */
function normalizeImageStoragePath(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return ''
  const raw = String(pathOrUrl).trim()
  const extracted = extractProductImageStoragePath(raw)
  return (extracted || raw).replace(/^\/+/, '')
}

export function extractPathsFromProductImageUploadResponse(data) {
  if (!data || typeof data !== 'object') return []
  const imgs = /** @type {{ images?: unknown }} */ (data).images
  if (!Array.isArray(imgs)) return []
  const out = []
  for (let i = 0; i < imgs.length; i++) {
    const item = imgs[i]
    if (typeof item === 'string' && item.trim()) {
      const n = normalizeImageStoragePath(item)
      if (n) out.push(n)
      continue
    }
    if (item && typeof item === 'object' && item.image != null) {
      const n = normalizeImageStoragePath(item.image)
      if (n) out.push(n)
    }
  }
  return out
}

/**
 * Upload new files for a variant row, then return full `images` path list for VariantCreate/Update.
 * Files are stored via the product images endpoint; paths are referenced on the variant per OpenAPI.
 *
 * @param {number | string} productId
 * @param {{ existingImagePaths?: string[], imageFiles?: File[] }} row
 * @returns {Promise<string[]>}
 */
/**
 * Ordered image storage paths from GET product (`images[]` / ProductImageOutSchema),
 * same source ProductImagesField uses for previews.
 *
 * @param {unknown} productDto — body of GET /api/products/{id}
 * @returns {string[]}
 */
export function extractImagePathsFromProductDto(productDto) {
  if (!productDto || typeof productDto !== 'object') return []
  const imgs = /** @type {{ images?: unknown }} */ (productDto).images
  if (!Array.isArray(imgs)) return []
  const out = []
  for (let i = 0; i < imgs.length; i++) {
    const item = imgs[i]
    if (typeof item === 'string' && item.trim()) {
      const n = normalizeImageStoragePath(item)
      if (n) out.push(n)
      continue
    }
    if (item && typeof item === 'object' && item.image != null) {
      const n = normalizeImageStoragePath(item.image)
      if (n) out.push(n)
    }
  }
  return out
}

/**
 * Cover image storage path for list/detail rows (`images[]` / ProductImageOutSchema).
 *
 * @param {unknown} productDto
 * @returns {string}
 */
export function pickProductCoverImagePath(productDto) {
  if (!productDto || typeof productDto !== 'object') return ''
  const imgs = /** @type {{ images?: unknown }} */ (productDto).images
  if (!Array.isArray(imgs) || imgs.length === 0) return ''

  const featured = imgs.find(
    (item) => item && typeof item === 'object' && Boolean(item.is_featured),
  )
  const chosen = featured ?? imgs[0]

  if (typeof chosen === 'string' && chosen.trim()) {
    return normalizeImageStoragePath(chosen) || ''
  }
  if (chosen && typeof chosen === 'object' && chosen.image != null) {
    return normalizeImageStoragePath(chosen.image) || ''
  }
  return ''
}

async function getOrderedProductImagePaths(productId) {
  const dto = await getProductById(productId)
  return extractImagePathsFromProductDto(dto)
}

/**
 * Same multipart upload as main product images (`POST .../images`), then discover **new**
 * paths by diffing GET product before vs after — reliable regardless of upload response shape.
 *
 * @param {number | string} productId
 * @param {{ existingImagePaths?: string[], imageFiles?: File[] }} row
 * @returns {Promise<string[]>}
 */
export async function resolveVariantRowImagePaths(productId, row) {
  const existing = Array.isArray(row?.existingImagePaths)
    ? row.existingImagePaths.map((s) => normalizeImageStoragePath(s)).filter(Boolean)
    : []
  const files = Array.isArray(row?.imageFiles)
    ? row.imageFiles.filter((f) => f instanceof File)
    : []
  if (files.length === 0) return dedupePathsPreserveOrder(existing)

  const beforeOrdered = await getOrderedProductImagePaths(productId)
  const beforeSet = new Set(beforeOrdered)

  await uploadProductImages(productId, files)

  const afterOrdered = await getOrderedProductImagePaths(productId)
  const newlyAdded = []
  for (let i = 0; i < afterOrdered.length; i++) {
    const p = afterOrdered[i]
    if (!beforeSet.has(p)) newlyAdded.push(p)
  }

  return dedupePathsPreserveOrder([...existing, ...newlyAdded])
}

function dedupePathsPreserveOrder(paths) {
  const seen = new Set()
  const out = []
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i]
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  return out
}

/**
 * @param {number | string} productId
 * @param {File} file
 * @param {{ featuredIndex?: number | null }} [options]
 */
export async function uploadProductImage(productId, file, options = {}) {
  return uploadProductImages(productId, [file], options)
}

function resolveProductVideoUploadUrl(productId) {
  const pathTpl =
    String(import.meta.env.VITE_PRODUCT_VIDEO_UPLOAD_PATH_TEMPLATE || '').trim() ||
    '/api/products/{productId}/videos'
  const path = pathTpl
    .replace(/\{productId\}/g, String(productId))
    .replace(/\{id\}/g, String(productId))
  return path.startsWith('/') ? path : `/${path}`
}

function videoFormFieldName() {
  const name = String(import.meta.env.VITE_PRODUCT_VIDEO_FORM_FIELD || '').trim()
  return name || 'video'
}

async function postProductVideoForm(productId, file, fieldName) {
  const formData = new FormData()
  formData.append(fieldName, file)
  const { data } = await apiClient.post(resolveProductVideoUploadUrl(productId), formData, {
    transformRequest: [
      (payload, headers) => {
        if (payload instanceof FormData) {
          delete headers['Content-Type']
        }
        return payload
      },
    ],
  })
  return data
}

/**
 * POST `/api/products/{product_id}/videos` — multipart product video upload.
 *
 * @param {number | string} productId
 * @param {File} file
 * @returns {Promise<unknown>}
 */
export async function uploadProductVideo(productId, file) {
  if (!(file instanceof File)) return null
  if (!/^video\//i.test(file.type)) {
    throw new Error('Selected file must be a video')
  }
  const primaryField = videoFormFieldName()
  try {
    return await postProductVideoForm(productId, file, primaryField)
  } catch (err) {
    const status = err?.status ?? err?.response?.status
    if ((status === 400 || status === 422) && primaryField !== 'file') {
      return postProductVideoForm(productId, file, 'file')
    }
    throw err
  }
}

function resolveProductImageDeleteUrl(productId, imageId) {
  const pathTpl =
    String(import.meta.env.VITE_PRODUCT_IMAGE_DELETE_PATH_TEMPLATE || '').trim() ||
    '/api/products/{productId}/images/{imageId}'
  const path = pathTpl
    .replace(/\{productId\}/g, String(productId))
    .replace(/\{imageId\}/g, String(imageId))
  return path.startsWith('/') ? path : `/${path}`
}

function resolveProductImageSetFeaturedUrl(productId, imageId) {
  const pathTpl =
    String(import.meta.env.VITE_PRODUCT_IMAGE_SET_FEATURED_PATH_TEMPLATE || '').trim() ||
    '/api/products/{productId}/images/{imageId}/set-featured'
  const path = pathTpl
    .replace(/\{productId\}/g, String(productId))
    .replace(/\{imageId\}/g, String(imageId))
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * PATCH `/api/products/{product_id}/images/{image_id}/set-featured` — marks image as cover (`is_featured`).
 *
 * @param {number | string} productId
 * @param {number | string} imageId
 * @returns {Promise<unknown>}
 */
export async function setFeaturedProductImage(productId, imageId) {
  const { data } = await apiClient.patch(resolveProductImageSetFeaturedUrl(productId, imageId))
  return data
}

/**
 * DELETE stored product image (path follows OpenAPI / backend).
 *
 * @param {number | string} productId
 * @param {number | string} imageId — server image row id from product `images[].id`
 */
export async function deleteProductImage(productId, imageId) {
  await apiClient.delete(resolveProductImageDeleteUrl(productId, imageId))
}

// --- Variants (per SKU / color / size — each row has its own price). @see OpenAPI "Variants"

/**
 * GET /api/products/{product_id}/variants
 * @param {number | string} productId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function listProductVariants(productId, options = {}) {
  return retryRateLimitedVariantRequest(async () => {
    const { data } = await apiClient.get(`/api/products/${productId}/variants`, {
      signal: options.signal,
    })
    return data
  })
}

/**
 * POST /api/products/{product_id}/variants — VariantCreateSchema
 * @param {number | string} productId
 * @param {{
 *   price: number
 *   sku?: string | null
 *   compare_price?: number | null
 *   is_offer?: boolean
 *   stock_quantity?: number
 *   images?: string[]
 *   attributes: Array<{ key: string, key_ar?: string | null, value_en: string, value_ar?: string | null, sort_order?: number }>
 * }} payload
 */
export async function createProductVariant(productId, payload) {
  return retryRateLimitedVariantRequest(async () => {
    const { data } = await apiClient.post(`/api/products/${productId}/variants`, payload)
    return data
  })
}

/**
 * POST variant, then PATCH `status` only when the create response does not already match it.
 * VariantCreateSchema has no `status` field, so the API assigns whatever it defaults to on
 * creation, so the response is inspected rather than generating a redundant request for the
 * common case where the backend already created the desired status.
 * @param {number | string} productId
 * @param {Parameters<typeof createProductVariant>[1]} payload
 * @param {unknown} rowLike — row or `{ status }` for desired status
 */
export async function createProductVariantWithInitialStatus(productId, payload, rowLike) {
  const data = await createProductVariant(productId, payload)
  const vid = parseVariantIdFromDto(data) ?? (data && typeof data === 'object' ? Number(data.id) : NaN)
  const desired = variantStatusForApiRow(rowLike)
  const createdStatus = String(data?.status ?? '').trim().toLowerCase()
  if (createdStatus === desired) return data
  if (Number.isFinite(vid) && vid > 0) {
    const updated = await updateProductVariant(productId, vid, { status: desired })
    return updated ?? data
  }
  return data
}

/**
 * PATCH /api/products/{product_id}/variants/{variant_id}
 * @param {number | string} productId
 * @param {number | string} variantId
 * @param {Record<string, unknown>} payload — VariantUpdateSchema (price, status, stock_quantity, attributes, …)
 */
export async function updateProductVariant(productId, variantId, payload) {
  return retryRateLimitedVariantRequest(async () => {
    const { data } = await apiClient.patch(`/api/products/${productId}/variants/${variantId}`, payload)
    return data
  })
}

/**
 * DELETE /api/products/{product_id}/variants/{variant_id}
 * Both ids are in the path per OpenAPI (integer segments).
 */
export async function deleteProductVariant(productId, variantId) {
  const pid = Number(productId)
  const vid = Number(variantId)
  if (!Number.isFinite(pid) || pid < 1 || !Number.isFinite(vid) || vid < 1) {
    throw new Error('Invalid product or variant id')
  }
  await retryRateLimitedVariantRequest(() =>
    apiClient.delete(`/api/products/${pid}/variants/${vid}`),
  )
}
