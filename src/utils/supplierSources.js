/**
 * Helpers for GET /api/orders/{id}/supplier-sources: who to contact for a line that
 * came from a supplier's store, and where the product is on their site.
 */

/**
 * The URLs originate outside this system, and React does not block `javascript:` hrefs.
 * @param {unknown} value
 * @returns {string}
 */
export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

/**
 * @param {unknown} number
 * @returns {string}
 */
export function whatsappUrl(number) {
  const digits = String(number ?? '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

/**
 * @param {unknown} raw
 * @returns {{
 *   byItemId: Map<string, string>
 *   stores: { storeId: unknown, storeName: string, whatsapp: string, whatsappUrl: string, storeUrl: string }[]
 * }}
 */
export function normalizeSupplierSources(raw) {
  const rows = Array.isArray(raw) ? raw : []
  const byItemId = new Map()
  const stores = new Map()
  for (const row of rows) {
    const productUrl = safeHttpUrl(row?.product_url)
    if (productUrl) byItemId.set(String(row.item_id), productUrl)
    if (!stores.has(row?.store_id)) {
      stores.set(row?.store_id, {
        storeId: row?.store_id,
        storeName: String(row?.store_name ?? ''),
        whatsapp: String(row?.merchant_whatsapp ?? ''),
        whatsappUrl: whatsappUrl(row?.merchant_whatsapp),
        storeUrl: safeHttpUrl(row?.source_store_url),
      })
    }
  }
  return { byItemId, stores: [...stores.values()] }
}
