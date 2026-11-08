/**
 * External-order pricing — purchase batches split a purchase and sale total over their orders.
 * A batch is final once created, so there is no update/delete call here.
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
 * GET /api/external-orders/batches — newest first.
 * @returns {Promise<{ count: number, items: unknown[] }>}
 */
export async function getPurchaseBatches(options = {}) {
  const { data } = await apiClient.get('/api/external-orders/batches', {
    params: { limit: options.limit ?? 50 },
    signal: options.signal,
  })
  return {
    count: Number(data?.count ?? 0),
    items: Array.isArray(data?.items) ? data.items : [],
  }
}

/**
 * POST /api/external-orders/batches — multipart; final, cannot be changed afterwards.
 * @param {{ purchaseTotal: number, saleTotal: number, note?: string, itemsFile: File, receiptFile: File }} payload
 */
export async function createPurchaseBatch({ purchaseTotal, saleTotal, note, itemsFile, receiptFile }) {
  const fd = new FormData()
  fd.append('purchase_total', String(purchaseTotal))
  fd.append('sale_total', String(saleTotal))
  fd.append('note', note ?? '')
  fd.append('items_file', itemsFile)
  fd.append('receipt_file', receiptFile)
  const { data } = await apiClient.post('/api/external-orders/batches', fd, multipartConfig())
  return data
}

/** Saves the blank Excel sheet; a plain link would not carry the auth header. */
export async function downloadPurchaseBatchTemplate() {
  const { data } = await apiClient.get('/api/external-orders/batches/template', {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = 'purchase_batch_template.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
