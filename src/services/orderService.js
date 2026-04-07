/**
 * Order Service — REST calls for orders.
 *
 * Note: Taswouk API v2.0 OpenAPI documents **items** and **accounts** only. Standard REST paths
 * `/api/orders` are implemented here so the dashboard is ready when the backend ships orders.
 * Until then, requests may return 404 — ViewModels surface that as a real error (no mock data).
 * @see https://v2.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/**
 * GET /api/orders
 * @returns {Promise<unknown[]>}
 */
export async function getOrders() {
  const { data } = await apiClient.get('/api/orders')
  return data
}

/**
 * GET /api/orders/:id
 * @param {number | string} orderId
 * @returns {Promise<unknown>}
 */
export async function getOrderById(orderId) {
  const { data } = await apiClient.get(`/api/orders/${orderId}`)
  return data
}
