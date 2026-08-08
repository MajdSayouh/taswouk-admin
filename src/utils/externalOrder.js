/**
 * Helpers for external-shop orders (product links, store_name "External", null product_id).
 */

/**
 * @param {unknown} value
 */
export function isProbablyUrl(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

/**
 * @param {unknown} raw
 */
export function isExternalOrderRaw(raw) {
  if (raw == null || typeof raw !== 'object') return false
  const r = /** @type {Record<string, unknown>} */ (raw)
  const orderType = String(r.order_type ?? r.orderType ?? '')
    .trim()
    .toLowerCase()
  if (orderType === 'mall') return false
  if (orderType === 'external') return true
  const storeName = String(r.store_name ?? r.storeName ?? '')
    .trim()
    .toLowerCase()
  if (storeName === 'external') return true

  const items = Array.isArray(r.items) ? r.items : []
  return items.some((item) => {
    if (item == null || typeof item !== 'object') return false
    const row = /** @type {Record<string, unknown>} */ (item)
    const productId = row.product_id ?? row.productId
    const productName = String(row.product_name ?? row.name ?? '').trim()
    return (productId == null || productId === '') && productName !== ''
  })
}

/**
 * @param {unknown} items
 */
export function summarizePrimaryProductName(items) {
  const arr = Array.isArray(items) ? items : []
  if (!arr.length) return ''
  const first = arr[0]
  if (first == null || typeof first !== 'object') return ''
  const row = /** @type {Record<string, unknown>} */ (first)
  return String(row.product_name ?? row.name ?? '').trim()
}

/**
 * Short label for list cells; full URL kept for links.
 * @param {unknown} value
 */
export function formatExternalProductDisplay(value) {
  const s = String(value ?? '').trim()
  if (!s) return '—'
  if (!isProbablyUrl(s)) return s
  try {
    const u = new URL(s)
    const path = u.pathname.length > 36 ? `${u.pathname.slice(0, 36)}…` : u.pathname
    return `${u.hostname}${path}`
  } catch {
    return s.length > 72 ? `${s.slice(0, 72)}…` : s
  }
}
