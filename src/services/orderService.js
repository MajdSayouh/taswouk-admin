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
 * POST /api/delivery/assign — admin assigns a delivery user to a **store** order (AssignDeliverySchema).
 * @see https://v2.taswouk.com/api/docs#/Delivery/delivery_api_assign_delivery
 *
 * Store and mall orders are disambiguated by *endpoint*, not by a request field — mall orders
 * must go through `assignMallDeliveryOrder` (`POST /api/delivery/assign-mall`) instead. Calling
 * this one for a mall order id can resolve against an unrelated store order sharing the same
 * numeric id, surfacing that other order's status in a "cannot assign order with status: X" error.
 *
 * @param {number} orderId
 * @param {number} deliveryUserId
 * @returns {Promise<unknown>}
 */
export async function assignDeliveryOrder(orderId, deliveryUserId) {
  const { data } = await apiClient.post('/api/delivery/assign', {
    order_id: orderId,
    delivery_user_id: deliveryUserId,
  })
  return data
}

/**
 * POST /api/delivery/assign-mall — admin assigns a delivery user to a **mall** order
 * (AssignMallDeliverySchema).
 * @see https://v2.taswouk.com/api/docs#/Delivery/delivery_api_assign_mall_delivery
 *
 * Field name is a best guess (`mall_order_id`), inferred from the sibling
 * `PATCH /api/delivery/mall-orders/{mall_order_id}/status` endpoint using that same param name —
 * not yet confirmed against the actual AssignMallDeliverySchema. If the backend rejects this
 * with a validation (422) error naming a different field, that's the one to fix here.
 *
 * @param {number} orderId
 * @param {number} deliveryUserId
 * @returns {Promise<unknown>}
 */
export async function assignMallDeliveryOrder(orderId, deliveryUserId) {
  const { data } = await apiClient.post('/api/delivery/assign-mall', {
    mall_order_id: orderId,
    delivery_user_id: deliveryUserId,
  })
  return data
}

/**
 * Routes to the correct assign endpoint for the order's type — store and mall orders are
 * disambiguated by endpoint on this backend, not by a shared request field.
 * @param {number} orderId
 * @param {number} deliveryUserId
 * @param {'store' | 'mall'} [orderType]
 * @returns {Promise<unknown>}
 */
export async function assignDeliveryOrderForType(orderId, deliveryUserId, orderType) {
  if (String(orderType).toLowerCase() === 'mall') {
    return assignMallDeliveryOrder(orderId, deliveryUserId)
  }
  return assignDeliveryOrder(orderId, deliveryUserId)
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
