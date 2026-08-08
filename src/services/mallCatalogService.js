/**
 * Mall catalog products API (admin).
 * @see https://test.taswouk.com/api/docs#/Mall%20Products%20(Catalog)
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
 * GET /api/malls/products
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function listMallCatalogProducts(options = {}) {
  const { data } = await apiClient.get('/api/malls/products', { signal: options.signal })
  if (data && typeof data === 'object' && Array.isArray(data.products)) {
    return { count: Number(data.count) || data.products.length, products: data.products }
  }
  if (Array.isArray(data)) {
    return { count: data.length, products: data }
  }
  return { count: 0, products: [] }
}

/**
 * GET /api/malls/products/{product_id}
 * @param {number | string} productId
 */
export async function getMallCatalogProduct(productId) {
  const { data } = await apiClient.get(`/api/malls/products/${productId}`)
  return data
}

/**
 * POST /api/malls/products
 * @param {Record<string, unknown>} payload
 */
export async function createMallCatalogProduct(payload) {
  const { data } = await apiClient.post('/api/malls/products', payload)
  return data
}

/**
 * PUT /api/malls/products/{product_id}
 * @param {number | string} productId
 * @param {Record<string, unknown>} payload
 */
export async function updateMallCatalogProduct(productId, payload) {
  const { data } = await apiClient.put(`/api/malls/products/${productId}`, payload)
  return data
}

/**
 * DELETE /api/malls/products/{product_id}
 * @param {number | string} productId
 */
export async function deleteMallCatalogProduct(productId) {
  await apiClient.delete(`/api/malls/products/${productId}`)
}

/**
 * POST /api/malls/products/{product_id}/images — multipart `files[]`.
 * @param {number | string} productId
 * @param {Array<File | Blob> | File | Blob} files
 */
export async function uploadMallCatalogProductImages(productId, files) {
  const list = Array.isArray(files) ? files : [files]
  const valid = list.filter(isFileLike)
  if (valid.length === 0) throw new Error('Choose at least one image')
  const fd = new FormData()
  valid.forEach((file) => fd.append('files', file))
  const { data } = await apiClient.post(
    `/api/malls/products/${productId}/images`,
    fd,
    multipartConfig(),
  )
  return data
}

/**
 * PATCH /api/malls/products/{product_id}/images/{image_id}/set-featured
 * @param {number | string} productId
 * @param {number | string} imageId
 */
export async function setFeaturedMallCatalogProductImage(productId, imageId) {
  const { data } = await apiClient.patch(
    `/api/malls/products/${productId}/images/${imageId}/set-featured`,
  )
  return data
}

/**
 * DELETE /api/malls/products/{product_id}/images/{image_id}
 * @param {number | string} productId
 * @param {number | string} imageId
 */
export async function deleteMallCatalogProductImage(productId, imageId) {
  await apiClient.delete(`/api/malls/products/${productId}/images/${imageId}`)
}
