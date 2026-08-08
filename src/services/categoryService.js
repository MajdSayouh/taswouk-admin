/**
 * Categories API integration with env-overridable paths.
 * Defaults target common REST shapes and include lightweight fallbacks.
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

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.items)) return data.items
  return []
}

export function getCategoriesListPath() {
  return envPath('VITE_CATEGORIES_TREE_PATH', '/api/products/categories/tree')
}

export function getCategoryCreatePath() {
  return envPath('VITE_CATEGORY_CREATE_PATH', '/api/products/categories')
}

export function getCategoryDetailPathTemplate() {
  return envPath('VITE_CATEGORY_DETAIL_PATH_TEMPLATE', '/api/products/categories/{id}')
}

export function getCategoryLogoPathTemplate() {
  return envPath('VITE_CATEGORY_LOGO_PATH_TEMPLATE', '/api/products/categories/{id}/logo')
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

/**
 * Full category tree for the admin (all `is_active` values). Public storefront / mobile apps
 * should only list categories and subcategories where `is_active` is true; that filtering is
 * enforced on the API for those clients or in their BFF, not in this call.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function listCategories(options = {}) {
  const { data } = await apiClient.get(getCategoriesListPath(), { signal: options.signal })
  return normalizeListResponse(data)
}

function normalizeCreateOrUpdatePayload(payload) {
  const out = { ...payload }
  if (out.parent_id == null && out.category_id != null) {
    out.parent_id = out.category_id
  }
  delete out.category_id
  return out
}

/**
 * @param {{ name: string, is_active?: boolean | null }} payload
 */
export async function createCategory(payload) {
  const body = normalizeCreateOrUpdatePayload(payload)
  const { data } = await apiClient.post(getCategoryCreatePath(), body)
  return data
}

/**
 * @param {number | string} id
 * @param {{ name?: string | null, is_active?: boolean | null }} payload
 */
export async function updateCategory(id, payload) {
  const body = normalizeCreateOrUpdatePayload(payload)
  const { data } = await apiClient.patch(withId(getCategoryDetailPathTemplate(), id), body)
  return data
}

/**
 * @param {number | string} id
 */
export async function deleteCategory(id) {
  await apiClient.delete(withId(getCategoryDetailPathTemplate(), id))
}

/**
 * @param {{ name: string, category_id: number | string, is_active?: boolean | null }} payload
 */
export async function createSubcategory(payload) {
  return createCategory(payload)
}

/**
 * @param {number | string} id
 * @param {{ name?: string | null, category_id?: number | string | null, is_active?: boolean | null }} payload
 */
export async function updateSubcategory(id, payload) {
  return updateCategory(id, payload)
}

/**
 * @param {number | string} id
 */
export async function deleteSubcategory(id) {
  await deleteCategory(id)
}

/**
 * POST multipart `logo` — CategorySummarySchema
 * @param {number | string} categoryId
 * @param {File | Blob} file
 */
export async function uploadCategoryLogo(categoryId, file) {
  if (!isFileLike(file)) throw new Error('Logo must be a file')
  const fd = new FormData()
  fd.append('logo', file)
  const { data } = await apiClient.post(
    withId(getCategoryLogoPathTemplate(), categoryId),
    fd,
    multipartConfig(),
  )
  return data
}

/**
 * DELETE category logo
 * @param {number | string} categoryId
 */
export async function deleteCategoryLogo(categoryId) {
  const { data } = await apiClient.delete(withId(getCategoryLogoPathTemplate(), categoryId))
  return data
}
