/**
 * Product Service — **Products** API (`/api/products/`, Jomran).
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'
import { getProductImageApiPath } from '../utils/mediaUrl.js'

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
export async function getProducts(params) {
  const { data } = await apiClient.get('/api/products/', { params: params || undefined })
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
 *   category?: string | null
 *   sub_category?: string | null
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
  const { data } = await apiClient.post('/api/products/', payload)
  return data
}

/**
 * PUT /api/products/{product_id} — ProductUpdateSchema
 * @param {number | string} productId
 * @param {{
 *   name?: string | null
 *   category?: string | null
 *   sub_category?: string | null
 *   size?: string[] | null
 *   colors?: string[] | string | null
 *   description?: string | null
 *   price?: number | null
 *   is_offer?: boolean | null
 *   new_price?: number | null
 *   rate?: number | null
 *   is_active?: boolean | null
 * }} payload
 * @returns {Promise<ProductDto>}
 */
export async function updateProduct(productId, payload) {
  const { data } = await apiClient.put(`/api/products/${productId}`, payload)
  return data
}

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
 * @param {number | string} productId
 * @param {File} file
 * @param {{ featuredIndex?: number | null }} [options]
 */
export async function uploadProductImage(productId, file, options = {}) {
  return uploadProductImages(productId, [file], options)
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

/**
 * DELETE stored product image (path follows OpenAPI / backend).
 *
 * @param {number | string} productId
 * @param {number | string} imageId — server image row id from product `images[].id`
 */
export async function deleteProductImage(productId, imageId) {
  await apiClient.delete(resolveProductImageDeleteUrl(productId, imageId))
}
