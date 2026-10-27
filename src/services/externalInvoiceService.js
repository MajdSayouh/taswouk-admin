/**
 * External-order invoices — the price of a delivered external-shop order, entered once.
 * The backend refuses any edit after creation (409), so there is no update/delete call here.
 */
import { apiClient } from './apiClient.js'

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
 * GET /api/external-orders/invoices/pending — delivered external orders with no price yet.
 * @returns {Promise<{ count: number, items: unknown[] }>}
 */
export async function getPendingExternalInvoices(options = {}) {
  const { data } = await apiClient.get('/api/external-orders/invoices/pending', {
    params: { limit: options.limit ?? 50 },
    signal: options.signal,
  })
  return {
    count: Number(data?.count ?? 0),
    items: Array.isArray(data?.items) ? data.items : [],
  }
}

/**
 * GET /api/external-orders/{order_id}/invoice — `null` when no price was entered yet (204).
 * @param {number | string} orderId
 */
export async function getExternalInvoice(orderId, options = {}) {
  const res = await apiClient.get(`/api/external-orders/${orderId}/invoice`, {
    signal: options.signal,
  })
  return res.status === 204 || !res.data ? null : res.data
}

/**
 * POST /api/external-orders/{order_id}/invoice — multipart; final, cannot be changed afterwards.
 * @param {number | string} orderId
 * @param {{ amount: number, note?: string, file: File }} payload
 */
export async function createExternalInvoice(orderId, { amount, note, file }) {
  const fd = new FormData()
  fd.append('amount', String(amount))
  fd.append('note', note ?? '')
  fd.append('file', file)
  const { data } = await apiClient.post(
    `/api/external-orders/${orderId}/invoice`,
    fd,
    multipartConfig(),
  )
  return data
}
