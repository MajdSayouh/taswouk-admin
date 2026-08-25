/**
 * Normalize order detail payloads (GET /api/orders/{id} and list rows).
 */
import { isExternalOrderRaw } from './externalOrder.js'

function firstNonEmpty(...candidates) {
  for (const c of candidates) {
    if (c == null) continue
    const s = typeof c === 'string' ? c : String(c)
    if (s.trim()) return s
  }
  return ''
}

/**
 * @param {unknown} lat
 * @param {unknown} lng
 */
export function isValidGeoCoord(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false
  if (la === 0 && lo === 0) return false
  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return false
  return true
}

/**
 * @param {unknown} raw
 * @returns {{ lat: number; lng: number } | null}
 */
export function coordsFromLatLng(raw) {
  if (raw == null || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const lat = r.latitude ?? r.lat
  const lng = r.longitude ?? r.lng ?? r.lon
  if (!isValidGeoCoord(lat, lng)) return null
  return { lat: Number(lat), lng: Number(lng) }
}

/**
 * Best-effort driver GPS from API payloads (supports future/extra backend fields).
 * @param {unknown} raw
 * @returns {{ lat: number; lng: number } | null}
 */
export function extractDriverLocation(raw) {
  if (raw == null || typeof raw !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (raw)
  const nested =
    r.delivery_user && typeof r.delivery_user === 'object'
      ? /** @type {Record<string, unknown>} */ (r.delivery_user)
      : null

  const lat =
    r.driver_latitude ??
    r.driverLatitude ??
    r.delivery_user_latitude ??
    r.delivery_latitude ??
    r.current_latitude ??
    r.last_latitude ??
    nested?.latitude ??
    nested?.lat

  const lng =
    r.driver_longitude ??
    r.driverLongitude ??
    r.delivery_user_longitude ??
    r.delivery_longitude ??
    r.current_longitude ??
    r.last_longitude ??
    nested?.longitude ??
    nested?.lng ??
    nested?.lon

  if (!isValidGeoCoord(lat, lng)) return null
  return { lat: Number(lat), lng: Number(lng) }
}

/**
 * @param {unknown} raw
 */
export function normalizeOrderDetail(raw) {
  if (raw == null || typeof raw !== 'object') {
    return null
  }
  const r = /** @type {Record<string, unknown>} */ (raw)
  const id = String(r.id ?? r.order_id ?? '')
  const itemsRaw = Array.isArray(r.items) ? r.items : []
  const items = itemsRaw.map((item, idx) => {
    const row = item && typeof item === 'object' ? /** @type {Record<string, unknown>} */ (item) : {}
    const nestedProduct =
      row.product && typeof row.product === 'object'
        ? /** @type {Record<string, unknown>} */ (row.product)
        : null
    const attrs = Array.isArray(row.variant_attributes) ? row.variant_attributes : []
    const attrLabel = attrs
      .map((a) => {
        if (a && typeof a === 'object') {
          const o = /** @type {Record<string, unknown>} */ (a)
          const k = firstNonEmpty(
            o.attribute_key_ar,
            o.attribute_key,
            o.name,
            o.key,
            o.label,
          )
          const v = firstNonEmpty(o.value_ar, o.value_en, o.value, o.val)
          if (k && v) return `${k}: ${v}`
        }
        return ''
      })
      .filter(Boolean)
      .join(' · ')
    // Mall/grocery order items don't currently echo product_id from the backend (only a name +
    // price snapshot) — fall back to moll_product_id in case that ever becomes the field used.
    const productId = row.product_id ?? row.moll_product_id ?? null
    return {
      key: `${String(productId ?? row.variant_id ?? 'item')}:${idx}`,
      productId,
      variantId: row.variant_id ?? null,
      productName: String(row.product_name ?? row.name ?? nestedProduct?.name ?? '—'),
      productImageUrl: firstNonEmpty(
        row.product_image_url,
        row.product_image,
        row.image_url,
        row.image,
        nestedProduct?.product_image_url,
        nestedProduct?.image_url,
        nestedProduct?.image,
      ),
      variantSku: row.variant_sku != null ? String(row.variant_sku) : null,
      variantAttributes: attrLabel,
      productPrice: Number(row.product_price ?? row.price ?? 0),
      quantity: Number(row.quantity ?? 0),
      lineTotal: Number(row.line_total ?? row.lineTotal ?? 0),
      // External-store items (product_source: 'store') have no product_id — the backend gives a
      // direct link to the item on the external site (e.g. AliExpress) instead.
      productSource: firstNonEmpty(row.product_source, row.productSource) || null,
      productExternalUrl: firstNonEmpty(row.product_external_url, row.productExternalUrl) || null,
    }
  })

  const deliveryRaw =
    r.delivery_user_id ??
    r.deliveryUserId ??
    r.driver_id ??
    (r.delivery_user && typeof r.delivery_user === 'object'
      ? /** @type {Record<string, unknown>} */ (r.delivery_user).id
      : undefined)

  const customer =
    r.customer && typeof r.customer === 'object'
      ? /** @type {Record<string, unknown>} */ (r.customer)
      : null

  const mallId = r.moll_id ?? r.mall_id ?? r.mollId ?? r.mallId ?? null
  const mallName = firstNonEmpty(r.moll_name, r.mall_name, r.mollName, r.mallName)
  const storeName = firstNonEmpty(r.store_name, r.storeName)
  // Backend order_type enum is only 'store' | 'mall' (see /api/orders/{order_id}).
  // "Grocery" orders are mall orders for grocery-category products — there is no
  // separate grocery order type.
  const orderType = firstNonEmpty(
    r.order_type,
    r.orderType,
    mallId != null || mallName ? 'mall' : storeName ? 'store' : '',
  ).toLowerCase()

  return {
    id,
    number: String(r.number ?? r.order_number ?? (id ? `#${id}` : '—')),
    storeId: r.store_id ?? r.storeId ?? null,
    storeName,
    mallId,
    mallName,
    orderType,
    orderSourceName: orderType === 'mall' ? mallName : storeName,
    customerId: r.customer_id ?? r.customerId ?? customer?.id ?? null,
    customerName: String(
      r.customer_name ?? r.customerName ?? (r.customer_id != null ? `Customer #${r.customer_id}` : '—'),
    ),
    customerPhone: firstNonEmpty(
      r.customer_phone,
      r.customerPhone,
      customer?.phone,
      customer?.phone_number,
      customer?.mobile,
    ),
    status: String(r.status ?? r.order_status ?? 'pending').toLowerCase(),
    couponCode: r.coupon_code != null ? String(r.coupon_code) : null,
    discountPercent: Number(r.discount_percent ?? 0),
    subtotal: Number(r.subtotal ?? 0),
    discountAmount: Number(r.discount_amount ?? 0),
    progressiveCouponCode:
      r.progressive_coupon_code != null ? String(r.progressive_coupon_code) : null,
    progressiveTierApplied:
      r.progressive_tier_applied != null ? Number(r.progressive_tier_applied) : null,
    progressiveDiscountApplied: Number(r.progressive_discount_applied ?? 0),
    total: Number(r.total ?? r.amount ?? 0),
    addressText: String(r.address_text ?? r.address ?? '—'),
    destination: coordsFromLatLng(r),
    deliveryUserId:
      deliveryRaw != null && String(deliveryRaw).trim() !== '' ? String(deliveryRaw) : null,
    driverLocation: extractDriverLocation(r),
    items,
    createdAt: String(r.created_at ?? r.createdAt ?? ''),
    isMock: Boolean(r.isMock),
    isExternal: isExternalOrderRaw(r),
  }
}
