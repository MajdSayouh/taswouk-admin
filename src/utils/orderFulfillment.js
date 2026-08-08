/** Fulfillment pipeline (excluding terminal cancelled). Order matches API statuses. */
export const FULFILLMENT_PIPELINE = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
]

/**
 * @param {string} status
 * @returns {number} Active step index in [0, pipeline.length - 1], or -1 if cancelled / unknown terminal
 */
export function getActivePipelineIndex(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'cancelled') return -1
  const i = FULFILLMENT_PIPELINE.indexOf(s)
  return i === -1 ? 0 : i
}

/**
 * @param {string} status
 * @returns {number} 0–100 for progress bar
 */
export function getFulfillmentProgressPercent(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'cancelled') return 0
  const i = FULFILLMENT_PIPELINE.indexOf(s)
  if (i === -1) return 0
  const last = FULFILLMENT_PIPELINE.length - 1
  return Math.round((i / last) * 100)
}

export function isCancelledOrderStatus(status) {
  return String(status || '').toLowerCase() === 'cancelled'
}

/** Max pipeline index (inclusive) where admin may cancel: pending (0), confirmed (1). */
const ADMIN_CANCEL_MAX_PIPELINE_INDEX = 1

/**
 * Whether the dashboard may offer “cancel order” for this status.
 * Matches first two fulfillment steps only; later steps are locked.
 * @param {string} status
 */
export function canAdminCancelOrder(status) {
  const s = String(status || '').toLowerCase()
  const i = FULFILLMENT_PIPELINE.indexOf(s)
  if (i === -1) return false
  return i <= ADMIN_CANCEL_MAX_PIPELINE_INDEX
}

/**
 * Ant Steps item status per step index for the given order status.
 * @param {string} orderStatus
 * @param {number} stepIndex
 * @returns {'wait' | 'process' | 'finish' | 'error'}
 */
export function fulfillmentStepItemStatus(orderStatus, stepIndex) {
  const s = String(orderStatus || '').toLowerCase()
  if (s === 'cancelled') {
    return stepIndex === 0 ? 'error' : 'wait'
  }
  const activeIdx = FULFILLMENT_PIPELINE.indexOf(s)
  const lastIdx = FULFILLMENT_PIPELINE.length - 1
  if (activeIdx === -1) {
    return stepIndex === 0 ? 'process' : 'wait'
  }
  if (activeIdx === lastIdx) {
    return 'finish'
  }
  if (stepIndex < activeIdx) return 'finish'
  if (stepIndex === activeIdx) return 'process'
  return 'wait'
}
