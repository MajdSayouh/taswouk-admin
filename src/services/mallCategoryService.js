/**
 * Mall categories API — tree, CRUD, toggle active.
 * @see https://test.taswouk.com/api/docs#/Mall%20Categories
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

export function getMallCategoriesTreePath() {
  return envPath('VITE_MALL_CATEGORIES_TREE_PATH', '/api/malls/categories/tree')
}

export function getMallCategoryCreatePath() {
  return envPath('VITE_MALL_CATEGORY_CREATE_PATH', '/api/malls/categories')
}

export function getMallCategoryDetailPathTemplate() {
  return envPath('VITE_MALL_CATEGORY_DETAIL_PATH_TEMPLATE', '/api/malls/categories/{id}')
}

export function getMallCategoryToggleActivePathTemplate() {
  return envPath(
    'VITE_MALL_CATEGORY_TOGGLE_ACTIVE_PATH_TEMPLATE',
    '/api/malls/categories/{id}/toggle-active',
  )
}

export function getMallCategoryLogoPathTemplate() {
  return envPath(
    'VITE_MALL_CATEGORY_LOGO_PATH_TEMPLATE',
    '/api/malls/categories/{id}/logo',
  )
}

export function getMallCategoryMovePathTemplate() {
  return envPath(
    'VITE_MALL_CATEGORY_MOVE_PATH_TEMPLATE',
    '/api/malls/categories/{id}/move',
  )
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
        if (body instanceof FormData) delete headers['Content-Type']
        return body
      },
    ],
  }
}

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<unknown[]>}
 */
export async function listMallCategories(options = {}) {
  const { data } = await apiClient.get(getMallCategoriesTreePath(), { signal: options.signal })
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
 * @param {{ name: string, description?: string | null, parent_id?: number | null, is_active?: boolean | null }} payload
 */
export async function createMallCategory(payload) {
  const body = normalizeCreateOrUpdatePayload(payload)
  const { data } = await apiClient.post(getMallCategoryCreatePath(), body)
  return data
}

/**
 * @param {number | string} id
 * @param {{ name?: string | null, description?: string | null, parent_id?: number | null, is_active?: boolean | null }} payload
 */
export async function updateMallCategory(id, payload) {
  const body = normalizeCreateOrUpdatePayload(payload)
  const { data } = await apiClient.patch(withId(getMallCategoryDetailPathTemplate(), id), body)
  return data
}

/**
 * @param {number | string} id
 */
export async function deleteMallCategory(id) {
  await apiClient.delete(withId(getMallCategoryDetailPathTemplate(), id))
}

/**
 * @param {number | string} id
 */
export async function toggleMallCategoryActive(id) {
  const { data } = await apiClient.post(withId(getMallCategoryToggleActivePathTemplate(), id))
  return data
}

/** Upload or replace a mall category/subcategory logo (`logo` multipart field). */
export async function uploadMallCategoryLogo(id, file) {
  if (!isFileLike(file)) throw new Error('Logo must be a file')
  const formData = new FormData()
  formData.append('logo', file)
  const { data } = await apiClient.post(
    withId(getMallCategoryLogoPathTemplate(), id),
    formData,
    multipartConfig(),
  )
  return data
}

/** Delete the current mall category/subcategory logo. */
export async function deleteMallCategoryLogo(id) {
  const { data } = await apiClient.delete(withId(getMallCategoryLogoPathTemplate(), id))
  return data
}

/** Move a category subtree under another parent; pass null to move it to the root. */
export async function moveMallCategory(id, newParentId) {
  const normalizedParent =
    newParentId == null || String(newParentId).trim() === '' ? null : Number(newParentId)
  const { data } = await apiClient.post(withId(getMallCategoryMovePathTemplate(), id), {
    new_parent_id: normalizedParent,
  })
  return data
}

/**
 * @param {{ name: string, category_id: number | string, description?: string | null, is_active?: boolean | null }} payload
 */
export async function createMallSubcategory(payload) {
  return createMallCategory(payload)
}

/**
 * @param {number | string} id
 * @param {{ name?: string | null, category_id?: number | string | null, description?: string | null, is_active?: boolean | null }} payload
 */
export async function updateMallSubcategory(id, payload) {
  return updateMallCategory(id, payload)
}

/**
 * @param {number | string} id
 */
export async function deleteMallSubcategory(id) {
  await deleteMallCategory(id)
}
