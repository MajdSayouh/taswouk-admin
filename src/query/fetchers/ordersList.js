import * as orderService from '../../services/orderService.js'
import { createOrder } from '../../models/Order.js'
import { isExternalOrderRaw, summarizePrimaryProductName } from '../../utils/externalOrder.js'

export function normalizeOrderListItem(raw) {
  if (raw == null || typeof raw !== 'object') {
    return createOrder({ id: 'unknown', number: '—', customerName: '—', total: 0, status: 'pending' })
  }
  const r = raw
  const cid = r.customer_id ?? r.customerId ?? r.customer?.id
  const customerLabel =
    r.customer_name ?? r.customerName ?? (cid != null ? `Customer #${cid}` : '—')
  const items = Array.isArray(r.items) ? r.items : []
  const firstItem = items[0]
  const mallId = r.moll_id ?? r.mall_id ?? r.mollId ?? r.mallId ?? null
  const mallName = String(r.moll_name ?? r.mall_name ?? r.mollName ?? r.mallName ?? '').trim()
  const storeName = String(r.store_name ?? r.storeName ?? '').trim()
  // Backend order_type enum is only 'store' | 'mall' (see /api/orders/{order_id}).
  // "Grocery" orders are mall orders for grocery-category products — there is no
  // separate grocery order type.
  const orderType = String(
    r.order_type ?? r.orderType ?? (mallId != null || mallName ? 'mall' : storeName ? 'store' : ''),
  )
    .trim()
    .toLowerCase()
  const base = createOrder({
    id: String(r.id ?? r.order_id ?? ''),
    number: r.number ?? r.order_number ?? (r.id != null ? `#${r.id}` : '—'),
    customerName: customerLabel,
    customerId: cid ?? null,
    customerPhone:
      r.customer_phone ??
      r.customerPhone ??
      r.customer?.phone ??
      r.customer?.phone_number ??
      r.customer?.mobile ??
      '',
    total: Number(r.total ?? r.amount ?? r.grand_total ?? 0),
    status: (r.status ?? 'pending').toLowerCase(),
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
    deliveryUserId:
      r.delivery_user_id ??
      r.deliveryUserId ??
      r.driver_id ??
      r.delivery_user?.id ??
      r.assignment?.delivery_user_id ??
      undefined,
  })
  return {
    ...base,
    orderType,
    storeName,
    mallId,
    mallName,
    orderSourceName: orderType === 'mall' ? mallName : storeName,
    isExternal: isExternalOrderRaw(r),
    primaryProductName: summarizePrimaryProductName(items),
    itemCount: items.length,
    productImageUrl: firstItem?.product_image_url ?? null,
    couponCode: r.coupon_code != null ? String(r.coupon_code) : null,
    progressiveCouponCode:
      r.progressive_coupon_code != null ? String(r.progressive_coupon_code) : null,
    progressiveTierApplied:
      r.progressive_tier_applied != null ? Number(r.progressive_tier_applied) : null,
    discountAmount: Number(r.discount_amount ?? 0),
    progressiveDiscountApplied: Number(r.progressive_discount_applied ?? 0),
  }
}

/** Shared GET /api/orders/ list fetch — one cache entry for dashboard + orders page. */
export async function fetchOrdersList({ signal } = {}) {
  const data = await orderService.getOrders({ signal })
  const list = Array.isArray(data) ? data : []
  return list.map(normalizeOrderListItem)
}
