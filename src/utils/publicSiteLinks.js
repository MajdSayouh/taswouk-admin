/**
 * Links from an order's line items out to the public storefront, so an admin can open the
 * product a customer bought directly from the orders screen.
 */

const STORE_PRODUCT_BASE = 'https://web.taswouk.com/ar/products'
const GROCERY_PRODUCT_BASE = 'https://taswouk.com/en/grocery'

/**
 * @param {{ orderType: string, mallId: string | number | null, productId: string | number | null }} args
 * @returns {string} the public product URL, or '' if there isn't enough info to build one.
 */
export function buildOrderItemProductUrl({ orderType, mallId, productId }) {
  if (productId == null || String(productId).trim() === '') return ''

  if (String(orderType).toLowerCase() === 'mall') {
    // Grocery/mall products live at taswouk.com/en/grocery/{mallId}/products/{productId} —
    // needs the mall id too, which mall order items don't carry per-row (it's order-level).
    if (mallId == null || String(mallId).trim() === '') return ''
    return `${GROCERY_PRODUCT_BASE}/${encodeURIComponent(String(mallId))}/products/${encodeURIComponent(String(productId))}`
  }

  return `${STORE_PRODUCT_BASE}/${encodeURIComponent(String(productId))}`
}
