/**
 * Bulk offer — the rule the dashboard sends to `POST /api/products/bulk-offer`.
 *
 * Only the rule travels (percent or amount, and the figure). The server prices
 * each product from its own original price, so the dashboard never computes
 * per-product prices and cannot stack one discount on top of another.
 */

export const BULK_OFFER_TYPES = /** @type {const} */ (['percent', 'amount'])

/** Server-side ceiling on how many products one request may touch. */
export const BULK_OFFER_MAX_PRODUCTS = 500

/**
 * The discount figure, or null when it is not one the server would accept:
 * a percentage must be above 0 and below 100, an amount above 0.
 *
 * @param {'percent' | 'amount'} type
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseBulkOfferValue(type, raw) {
  if (raw == null || raw === '') return null
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return null
  if (type === 'percent' && value >= 100) return null
  if (!BULK_OFFER_TYPES.includes(type)) return null
  return value
}

/**
 * @param {{ productIds: Array<number | string>, action: 'apply' | 'remove', discountType?: string, value?: number }} input
 */
export function buildBulkOfferPayload({ productIds, action, discountType, value }) {
  const ids = [...new Set(productIds.map((id) => Number(id)).filter(Number.isInteger))]
  if (action === 'remove') return { product_ids: ids, action: 'remove' }
  return { product_ids: ids, action: 'apply', discount_type: discountType, value }
}

/**
 * @param {unknown} data
 * @returns {{ updated: number[], skipped: Array<{ id: number, name: string, reason: string }> }}
 */
export function normalizeBulkOfferResult(data) {
  const body = data && typeof data === 'object' ? /** @type {Record<string, unknown>} */ (data) : {}
  const updated = Array.isArray(body.updated) ? body.updated.map(Number) : []
  const skipped = Array.isArray(body.skipped)
    ? body.skipped.map((row) => ({
        id: Number(row?.id),
        name: String(row?.name ?? ''),
        reason: String(row?.reason ?? ''),
      }))
    : []
  return { updated, skipped }
}
