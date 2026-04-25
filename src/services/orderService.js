/**
 * Order Service — REST calls for orders.
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/**
 * GET /api/orders/
 * @returns {Promise<unknown[]>}
 */
export async function getOrders() {
  const { data } = await apiClient.get('/api/orders/')
  return data
}

/**
 * GET /api/orders/{order_id}
 * @param {number | string} orderId
 * @returns {Promise<unknown>}
 */
export async function getOrderById(orderId) {
  const { data } = await apiClient.get(`/api/orders/${orderId}`)
  return data
}
