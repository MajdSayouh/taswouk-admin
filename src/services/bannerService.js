/**
 * Banners API — list, create, update, delete, replace image.
 * @see https://test.taswouk.com/api/docs#/Banners
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

/**
 * GET /api/banners/
 * @returns {Promise<unknown[]>}
 */
export async function listBanners(options = {}) {
  const { data } = await apiClient.get('/api/banners/', { signal: options.signal })
  return data
}

/**
 * POST /api/banners/ — multipart; `image` required.
 * @param {{ image: File | Blob, link?: string | null, description?: string | null }} payload
 */
export async function createBanner(payload) {
  const body = toMultipart(payload)
  const { data } = await apiClient.post('/api/banners/', body, multipartConfig())
  return data
}

/**
 * PATCH /api/banners/{banner_id}
 * @param {number | string} bannerId
 * @param {{ link?: string | null, description?: string | null }} payload
 */
export async function updateBanner(bannerId, payload) {
  const { data } = await apiClient.patch(`/api/banners/${bannerId}`, payload)
  return data
}

/**
 * DELETE /api/banners/{banner_id}
 * @param {number | string} bannerId
 */
export async function deleteBanner(bannerId) {
  await apiClient.delete(`/api/banners/${bannerId}`)
}

/**
 * POST /api/banners/{banner_id}/image — multipart `image`
 * @param {number | string} bannerId
 * @param {File | Blob} imageFile
 */
export async function replaceBannerImage(bannerId, imageFile) {
  if (!isFileLike(imageFile)) {
    throw new Error('Image must be a file')
  }
  const body = toMultipart({ image: imageFile })
  const { data } = await apiClient.post(`/api/banners/${bannerId}/image`, body, multipartConfig())
  return data
}
