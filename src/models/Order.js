// Model layer: describes the shape of an Order entity for the ecommerce domain.

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} number
 * @property {string} customerName
 * @property {number} total
 * @property {'pending' | 'paid' | 'shipped' | 'cancelled'} status
 * @property {string} createdAt
 */

export function createOrder(data) {
  return {
    id: data.id ?? '',
    number: data.number ?? '',
    customerName: data.customerName ?? '',
    total: Number(data.total ?? 0),
    status: data.status ?? 'pending',
    createdAt: data.createdAt ?? new Date().toISOString(),
  }
}

