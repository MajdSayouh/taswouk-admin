/** Admin finance API: order costs and the ledger of delivery income and operating costs. */
import { apiClient } from './apiClient.js'

/** @param {number | string} orderId */
export async function getOrderFinance(orderId) {
  const { data } = await apiClient.get(`/api/finance/orders/${orderId}`)
  return data
}

/**
 * Final: the backend refuses a second entry for the same order.
 * @param {number | string} orderId
 * @param {{ purchase_amount?: string, profit_amount?: string, note?: string }} payload
 */
export async function enterOrderCost(orderId, payload) {
  const { data } = await apiClient.post(`/api/finance/orders/${orderId}/cost`, payload)
  return data
}

/** @param {File} file Excel sheet with order-number and cost columns. */
export async function importOrderCosts(file) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await apiClient.post('/api/finance/costs/import', fd, {
    transformRequest: [
      (body, headers) => {
        delete headers['Content-Type']
        return body
      },
    ],
  })
  return data
}

export async function getFinancialEntries(options = {}) {
  const { data } = await apiClient.get('/api/finance/entries', {
    params: { limit: 200 },
    signal: options.signal,
  })
  return { count: Number(data?.count ?? 0), items: Array.isArray(data?.items) ? data.items : [] }
}

export async function createFinancialEntry(payload) {
  const { data } = await apiClient.post('/api/finance/entries', payload)
  return data
}

/** @param {number} entryId */
export async function voidFinancialEntry(entryId) {
  const { data } = await apiClient.post(`/api/finance/entries/${entryId}/void`)
  return data
}

/** @param {'global' | 'all'} scope */
export async function getOrdersAwaitingCost(scope, options = {}) {
  const { data } = await apiClient.get('/api/finance/orders/awaiting-cost', {
    params: { scope, limit: 200 },
    signal: options.signal,
  })
  return { count: Number(data?.count ?? 0), items: Array.isArray(data?.items) ? data.items : [] }
}

export async function getFinanceDrivers(options = {}) {
  const { data } = await apiClient.get('/api/finance/drivers', { signal: options.signal })
  return Array.isArray(data) ? data : []
}
