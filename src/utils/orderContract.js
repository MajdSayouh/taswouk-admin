// «نسبة العقد» on the order detail: the percent each store's lines were priced at, the basket at
// store prices, and the percent's total for the order. The backend sends these to the admin only.

/**
 * @param {ReturnType<typeof import('./orderDetail.js').normalizeOrderDetail> | null | undefined} detail
 * @returns {{
 *   stores: { key: string, name: string, percent: number }[]
 *   storeSubtotal: number
 *   amount: number
 * } | null} null when there is nothing to show: not an admin view, or an external-shop order
 *   (priced later by purchase batch, never by a contract percent).
 */
export function contractBreakdown(detail) {
  if (!detail || detail.isExternal || detail.contractAmount == null) return null

  // A cart: one percent per store row. A legacy mall row has none and is left out.
  const parts = (detail.parts ?? []).filter((part) => part.contractPercent != null)
  const stores = parts.length
    ? parts.map((part) => ({
        key: String(part.orderId ?? part.sellerName),
        name: part.sellerName,
        percent: part.contractPercent,
      }))
    : // A single row (`?split=true`) carries its percent on the order itself.
      [{ key: String(detail.id), name: detail.storeName, percent: detail.contractPercent ?? 0 }]

  return {
    stores,
    storeSubtotal: detail.storeSubtotal ?? detail.subtotal,
    amount: detail.contractAmount,
  }
}
