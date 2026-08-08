/**
 * External shops API (admin).
 * @see https://test.taswouk.com/api/docs#/External%20Shops
 */
import { apiClient } from './apiClient.js'

function envPath(name, fallback) {
  const v = import.meta.env[name]
  const s = v && String(v).trim()
  return s || fallback
}

function withId(pathTemplate, id) {
  return pathTemplate.replace(/\{id\}/g, String(id))
}

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

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.shops)) return data.shops
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.items)) return data.items
  return []
}

export function getExternalShopsListPath() {
  return envPath('VITE_EXTERNAL_SHOPS_LIST_PATH', '/api/external-shops/')
}

export function getExternalShopDetailPathTemplate() {
  return envPath('VITE_EXTERNAL_SHOP_DETAIL_PATH_TEMPLATE', '/api/external-shops/{id}')
}

export function getExternalShopLogoPathTemplate() {
  return envPath('VITE_EXTERNAL_SHOP_LOGO_PATH_TEMPLATE', '/api/external-shops/{id}/logo')
}

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function listExternalShops(options = {}) {
  const { data } = await apiClient.get(getExternalShopsListPath(), { signal: options.signal })
  return normalizeListResponse(data)
}

/**
 * @param {number | string} shopId
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function getExternalShop(shopId, options = {}) {
  const shops = await listExternalShops(options)
  return shops.find((row) => String(row?.id) === String(shopId)) ?? null
}

/**
 * @param {{ name: string, base_url: string, is_active?: boolean, requires_vpn?: boolean }} payload
 */
export async function createExternalShop(payload) {
  const { data } = await apiClient.post(getExternalShopsListPath(), payload)
  return data
}

/**
 * @param {number | string} shopId
 * @param {{ name: string, base_url: string, is_active?: boolean, requires_vpn?: boolean }} payload
 */
export async function updateExternalShop(shopId, payload) {
  const { data } = await apiClient.put(withId(getExternalShopDetailPathTemplate(), shopId), payload)
  return data
}

/**
 * @param {number | string} shopId
 */
export async function deleteExternalShop(shopId) {
  await apiClient.delete(withId(getExternalShopDetailPathTemplate(), shopId))
}

/**
 * POST multipart `file`
 * @param {number | string} shopId
 * @param {File | Blob} file
 */
export async function uploadExternalShopLogo(shopId, file) {
  if (!isFileLike(file)) throw new Error('Logo must be a file')
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await apiClient.post(
    withId(getExternalShopLogoPathTemplate(), shopId),
    fd,
    multipartConfig(),
  )
  return data
}
