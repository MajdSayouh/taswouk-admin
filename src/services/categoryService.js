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
 * Without `scope` the backend returns the store and restaurant trees but not the
 * mall's (those are still cut-over copies); pass `scope` to get one vertical,
 * the mall included.
 *
 * @param {{ signal?: AbortSignal, scope?: 'store' | 'restaurant' | 'mall' | 'pharmacy' }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function listCategories(options = {}) {
  const { data } = await apiClient.get(getCategoriesListPath(), {
    signal: options.signal,
    params: options.scope ? { scope: options.scope } : undefined,
  })
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
 * `scope` only counts on a root; a subcategory takes its parent's.
 * @param {{ name: string, is_active?: boolean | null, scope?: 'store' | 'restaurant' | 'mall' | 'pharmacy' }} payload
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

// ── Tree management (categories page) ───────────────────────────────────────
// Every call names the section it was made from (`expected_scope`), and the
// backend refuses a parent or a target from another section.

/**
 * One section's tree with product counts, for the management page.
 * @param {{ scope: string, signal?: AbortSignal }} options
 */
export async function listCategoryTree({ scope, signal }) {
  const { data } = await apiClient.get(getCategoriesListPath(), {
    signal,
    params: { scope, with_counts: true },
  })
  return normalizeListResponse(data)
}

/** @param {number | string} id */
export async function getCategoryImpact(id) {
  const { data } = await apiClient.get(`${withId(getCategoryDetailPathTemplate(), id)}/impact`)
  return data
}

/**
 * @param {number | string} id
 * @param {{ scope: string, expected_scope: string, dry_run?: boolean, confirm_name?: string }} payload
 */
export async function changeCategoryScope(id, payload) {
  const { data } = await apiClient.post(
    `${withId(getCategoryDetailPathTemplate(), id)}/change-scope`,
    payload,
  )
  return data
}

/**
 * @param {number | string} id
 * @param {{ reassignTo?: number | string | null, expectedScope?: string }} [options]
 */
export async function deleteCategoryWithOptions(id, options = {}) {
  const params = {}
  if (options.reassignTo != null) params.reassign_to = Number(options.reassignTo)
  if (options.expectedScope) params.expected_scope = options.expectedScope
  await apiClient.delete(withId(getCategoryDetailPathTemplate(), id), { params })
}

/**
 * @param {number | string} id
 * @param {number | string} targetId
 */
export async function moveCategoryProducts(id, targetId) {
  const { data } = await apiClient.post(
    `${withId(getCategoryDetailPathTemplate(), id)}/move-products`,
    { target_category_id: Number(targetId) },
  )
  return data
}

/** @param {{ scope: string, parent_id: number | null, ordered_ids: number[] }} payload */
export async function reorderCategories(payload) {
  const { data } = await apiClient.post(`${getCategoryCreatePath()}/reorder`, payload)
  return data
}

/** @param {{ scope?: string, categoryId?: number | string, limit?: number, signal?: AbortSignal }} [options] */
export async function listCategoryChangeLog(options = {}) {
  const params = { limit: options.limit ?? 100 }
  if (options.scope) params.scope = options.scope
  if (options.categoryId != null) params.category_id = Number(options.categoryId)
  const { data } = await apiClient.get(`${getCategoryCreatePath()}/change-log`, {
    params,
    signal: options.signal,
  })
  return normalizeListResponse(data)
}
