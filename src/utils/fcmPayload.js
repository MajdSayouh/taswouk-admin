/**
 * Normalize FCM payloads for web. All `data.*` values arrive as strings from the JS SDK.
 *
 * @param {Record<string, unknown> | undefined} data
 */
function normalizeDataMap(data) {
  if (!data || typeof data !== 'object') return {}
  /** @type {Record<string, string>} */
  const out = {}
  for (const [k, v] of Object.entries(data)) {
    if (v == null) out[k] = ''
    else out[k] = typeof v === 'string' ? v : String(v)
  }
  return out
}

function firstNonEmpty(...candidates) {
  for (const c of candidates) {
    if (c == null) continue
    const s = typeof c === 'string' ? c : String(c)
    if (s.trim()) return s
  }
  return ''
}

/**
 * Backend sometimes puts a JSON string in one data key; try to read title/body from it.
 * @param {string} raw
 */
function tryParseNestedJson(raw) {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t.startsWith('{') && !t.startsWith('[')) return null
  try {
    const o = JSON.parse(t)
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

/**
 * Extract title, body, url for UI from an FCM payload (foreground SDK or compat SW).
 * @param {Record<string, unknown>} payload
 * @param {{ defaultTitle: string; defaultBody: string }} fallbacks
 */
export function extractFcmDisplayFields(payload, fallbacks) {
  const n =
    payload.notification && typeof payload.notification === 'object'
      ? payload.notification
      : {}
  const rawData = payload.data
  const data = normalizeDataMap(
    rawData && typeof rawData === 'object' ? /** @type {Record<string, unknown>} */ (rawData) : {},
  )

  /** @type {Record<string, unknown> | null} */
  let nested = null
  for (const key of ['notification', 'payload', 'message']) {
    const parsed = tryParseNestedJson(data[key] || '')
    if (parsed && typeof parsed === 'object') {
      nested = parsed
      break
    }
  }

  const nestedTitle =
    nested && typeof nested === 'object' && 'title' in nested
      ? String(/** @type {{ title?: unknown }} */ (nested).title ?? '')
      : ''
  const nestedBody =
    nested && typeof nested === 'object' && 'body' in nested
      ? String(/** @type {{ body?: unknown }} */ (nested).body ?? '')
      : ''

  const title = firstNonEmpty(
    n.title,
    data.title,
    data.notification_title,
    nestedTitle,
    fallbacks.defaultTitle,
  )
  const body = firstNonEmpty(
    n.body,
    data.body,
    data.message,
    data.notification_body,
    nestedBody,
    fallbacks.defaultBody,
  )

  /** Deep links for admin dashboard (matches push_notification_system doc: order_id, event). */
  function inferAdminPathFromData() {
    const oid = firstNonEmpty(data.order_id, data.orderId)
    if (oid) return '/orders'
    const ev = String(data.event || data.type || '').toLowerCase()
    if (
      ev.includes('order') ||
      ev === 'order_created' ||
      ev === 'order_confirmed' ||
      ev === 'order_assigned' ||
      ev === 'order_delivered'
    ) {
      return '/orders'
    }
    return ''
  }

  const urlRaw = firstNonEmpty(data.url, data.link, inferAdminPathFromData(), '/home')
  return { title, body, url: urlRaw, data }
}

/**
 * Push from customer app when a new order is placed (backend `data.event` / `data.type` variants).
 * @param {Record<string, string>} data
 */
export function isNewOrderPushPayload(data) {
  const ev = String(data.event || '').toLowerCase()
  const type = String(data.type || '').toUpperCase()
  const status = String(data.status || '').toLowerCase()

  if (
    ev === 'order_created' ||
    ev === 'new_order' ||
    ev === 'order_placed' ||
    ev === 'order.new' ||
    ev === 'orders.created' ||
    ev.includes('order_created') ||
    ev.includes('new_order')
  ) {
    return true
  }

  if (type === 'ORDER_CREATED' || type === 'NEW_ORDER') return true
  if (type === 'ORDER_STATUS' && status === 'pending') return true

  const oid = firstNonEmpty(data.order_id, data.orderId)
  if (oid && status === 'pending' && (ev === '' || ev.includes('creat') || ev.includes('new'))) {
    return true
  }

  return false
}

/**
 * Any order-related push (refresh orders list).
 * @param {Record<string, string>} data
 */
export function isOrderRelatedPushPayload(data) {
  if (isNewOrderPushPayload(data)) return true
  if (firstNonEmpty(data.order_id, data.orderId)) return true
  const ev = String(data.event || data.type || '').toLowerCase()
  return ev.includes('order')
}

/**
 * Foreground toast copy + routing for admin (new-order toasts link to orders).
 * @param {Record<string, unknown>} payload
 * @param {{ defaultTitle: string; defaultBody: string; newOrderTitle: string; newOrderBody: string; newOrderBodyGeneric: string }} copy
 */
export function resolveFcmToastDisplay(payload, copy) {
  const fallbacks = { defaultTitle: copy.defaultTitle, defaultBody: copy.defaultBody }
  const extracted = extractFcmDisplayFields(payload, fallbacks)
  const isNewOrder = isNewOrderPushPayload(extracted.data)
  const isOrderRelated = isOrderRelatedPushPayload(extracted.data)

  if (!isNewOrder) {
    return { ...extracted, isNewOrder: false, isOrderRelated }
  }

  const orderRef = firstNonEmpty(
    extracted.data.order_number,
    extracted.data.orderNumber,
    extracted.data.order_id,
    extracted.data.orderId,
  )

  const titleLooksGeneric =
    !extracted.title ||
    extracted.title === copy.defaultTitle ||
    extracted.title === 'Notification'
  const bodyLooksGeneric =
    !extracted.body ||
    extracted.body === copy.defaultBody ||
    extracted.body === 'You have a new message.'

  const title = titleLooksGeneric ? copy.newOrderTitle : extracted.title
  const body = bodyLooksGeneric
    ? orderRef
      ? copy.newOrderBody.replace('{{order}}', orderRef)
      : copy.newOrderBodyGeneric
    : extracted.body

  return {
    title,
    body,
    url: '/orders',
    data: extracted.data,
    isNewOrder: true,
    isOrderRelated: true,
  }
}
