/**
 * Order Service — REST calls for orders.
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/**
 * GET /api/orders/
 * @returns {Promise<unknown[]>}
 */
export async function getOrders(options = {}) {
  const { data } = await apiClient.get('/api/orders/', { signal: options.signal })
  return data
}

/**
 * GET /api/orders/{order_id}
 * @param {number | string} orderId
 * @param {'store' | 'mall'} [orderType] - Disambiguates order ids that collide across
 *   order sources. The backend returns "order id ambiguous" without it. Note: "grocery"
 *   orders are mall orders (grocery-category products sold via a moll) — pass 'mall'.
 * @returns {Promise<unknown>}
 */
export async function getOrderById(orderId, orderType) {
  const normalizedType = orderType === 'mall' ? 'mall' : orderType === 'store' ? 'store' : undefined
  const { data } = await apiClient.get(`/api/orders/${orderId}`, {
    params: normalizedType ? { order_type: normalizedType } : undefined,
  })
  return data
}

/**
 * GET /api/delivery/assignments — admin list of assigned orders (includes delivery_user_id).
 * @returns {Promise<unknown[]>}
 */
export async function getDeliveryAssignments() {
  const { data } = await apiClient.get('/api/delivery/assignments')
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/delivery/assign — admin assigns a delivery user to an order.
 * @see https://test.taswouk.com/api/docs#/Delivery/delivery_api_assign_order
 *
 * Order ids collide across store and mall orders (see getOrderById/updateOrderStatus above),
 * so `order_type` is included whenever known — without it the backend has no way to tell
 * this order apart from an unrelated order sharing the same numeric id, which manifests as
 * "cannot assign order with status: X" errors quoting a completely different order's status.
 *
 * @param {number} orderId
 * @param {number} deliveryUserId
 * @param {'store' | 'mall'} [orderType]
 * @returns {Promise<unknown>}
 */
export async function assignDeliveryOrder(orderId, deliveryUserId, orderType) {
  const normalizedType = orderType === 'mall' ? 'mall' : orderType === 'store' ? 'store' : undefined
  const { data } = await apiClient.post('/api/delivery/assign', {
    order_id: orderId,
    delivery_user_id: deliveryUserId,
    ...(normalizedType ? { order_type: normalizedType } : {}),
  })
  return data
}

/**
 * PATCH /api/orders/{order_id}/status
 * @see https://test.taswouk.com/api/docs#/Orders/orders_api_update_order_status
 *
 * Customer push notifications are sent by the **backend** when this succeeds (FCM to the
 * customer’s registered devices). The dashboard only issues the status change; ensure your
 * API dispatches notify-on-status-change for each transition (confirmed, preparing, etc.).
 *
 * @param {number} orderId
 * @param {'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'} status
 * @param {'store' | 'mall'} [orderType]
 * @returns {Promise<unknown>}
 */
export async function updateOrderStatus(orderId, status, orderType = 'store') {
  const normalizedType = String(orderType).toLowerCase() === 'mall' ? 'mall' : 'store'
  const { data } = await apiClient.patch(
    `/api/orders/${orderId}/status`,
    { status },
    { params: { order_type: normalizedType } },
  )
  return data
}
