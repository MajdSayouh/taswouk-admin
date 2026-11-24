/**
 * Delivery runs for local orders — /api/delivery-runs/ (admin JWT).
 * A run: the local orders one driver takes out on a day, each marked delivered or not.
 * Before a run, an order may be «قيد الشحن الداخلي» (store → Taswouk's warehouse) or «في المستودع».
 */
import { apiClient } from './apiClient.js'

/** @param {{ day?: string, status?: string, signal?: AbortSignal }} [options] */
export async function listDeliveryRuns(options = {}) {
  const { data } = await apiClient.get('/api/delivery-runs/', {
    params: { day: options.day || undefined, status: options.status || undefined },
    signal: options.signal,
  })
  return Array.isArray(data) ? data : []
}

/** Local orders waiting for a run, by where they are now. */
export async function getDeliveryRunCandidates(options = {}) {
  const { data } = await apiClient.get('/api/delivery-runs/candidates', {
    params: { governorate: options.governorate || undefined },
    signal: options.signal,
  })
  return {
    internal_shipping: data?.internal_shipping ?? [],
    ready: data?.ready ?? [],
    out_not_delivered: data?.out_not_delivered ?? [],
  }
}

export async function getDeliveryRun(runId, options = {}) {
  const { data } = await apiClient.get(`/api/delivery-runs/${runId}`, { signal: options.signal })
  return data
}

/** @param {{ day: string, driver_id?: number | null, note?: string }} payload */
export async function createDeliveryRun(payload) {
  const { data } = await apiClient.post('/api/delivery-runs/', payload)
  return data
}

export async function addOrdersToRun({ runId, orderIds }) {
  const { data } = await apiClient.post(`/api/delivery-runs/${runId}/orders`, { order_ids: orderIds })
  return data
}

export async function removeOrderFromRun({ runId, orderId }) {
  const { data } = await apiClient.delete(`/api/delivery-runs/${runId}/orders/${orderId}`)
  return data
}

export async function dispatchDeliveryRun(runId) {
  const { data } = await apiClient.post(`/api/delivery-runs/${runId}/dispatch`, {})
  return data
}

/** @param {{ runId: number, orderId: number, outcome: 'delivered' | 'failed', reason?: string }} args */
export async function decideRunOrder({ runId, orderId, outcome, reason }) {
  const { data } = await apiClient.post(`/api/delivery-runs/${runId}/orders/${orderId}/outcome`, {
    outcome,
    reason: reason ?? '',
  })
  return data
}

export async function closeDeliveryRun(runId) {
  const { data } = await apiClient.post(`/api/delivery-runs/${runId}/close`, {})
  return data
}

/** @param {{ orderId: number, stage: '' | 'internal_shipping' | 'at_warehouse' }} args */
export async function setOrderInternalStage({ orderId, stage }) {
  const { data } = await apiClient.post(`/api/delivery-runs/orders/${orderId}/internal-stage`, { stage })
  return data
}
