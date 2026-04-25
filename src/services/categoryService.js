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

/**
 * @returns {Promise<unknown[]>}
 */
export async function listCategories() {
  const { data } = await apiClient.get(getCategoriesListPath())
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
