/**
 * Product Service — maps to Taswouk **Items** API (`/api/items`).
 * The backend names the resource "items"; this service uses product-oriented names for the dashboard.
 * @see https://v2.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/**
 * @typedef {Object} ItemDto
 * @property {number | null} [id]
 * @property {string} name
 * @property {string | null} [description]
 * @property {number} price
 * @property {number} quantity
 * @property {boolean} [is_active]
 * @property {string | null} [created_at]
 * @property {string | null} [updated_at]
 */

/**
 * GET /api/items — public list of active items.
 * @returns {Promise<ItemDto[]>}
 */
export async function getProducts() {
  const { data } = await apiClient.get('/api/items')
  return data
}

/**
 * GET /api/items/{id}
 * @param {number | string} productId
 * @returns {Promise<ItemDto>}
 */
export async function getProductById(productId) {
  const { data } = await apiClient.get(`/api/items/${productId}`)
  return data
}

/**
 * POST /api/items — authenticated (store owner).
 * @param {{ name: string, description?: string | null, price: number, quantity?: number }} payload
 * @returns {Promise<ItemDto>}
 */
export async function createProduct(payload) {
  const { data } = await apiClient.post('/api/items', payload)
  return data
}
