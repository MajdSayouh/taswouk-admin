/**
 * Mall (API: Moll) — map MollOutSchema / MollCreateSchema / MollUpdateSchema.
 * @see https://test.taswouk.com/api/docs#/Malls
 */

/**
 * @typedef {Object} MallRow
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string | null} logoUrl
 * @property {string | null} startWorkingAt
 * @property {string | null} endWorkingAt
 * @property {boolean} priceMatch
 * @property {number} minimumOrder
 * @property {number} rate
 * @property {string} currency
 * @property {number | null} exchangeRate
 * @property {boolean} isActive
 * @property {string} phone
 * @property {string} address
 * @property {string} contactEmail
 * @property {string} createdAt
 */

/**
 * @param {unknown} raw
 * @returns {MallRow}
 */
export function mapMallFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      description: '',
      logoUrl: null,
      startWorkingAt: null,
      endWorkingAt: null,
      priceMatch: false,
      minimumOrder: 0,
      rate: 0,
      currency: 'SYP',
      exchangeRate: null,
      isActive: false,
      phone: '',
      address: '',
      contactEmail: '',
      createdAt: '',
    }
  }
  const exchangeRate = Number(raw.exchange_rate)
  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? '',
    description: raw.description ?? '',
    logoUrl: raw.logo_url ?? null,
    startWorkingAt: raw.start_working_at ?? null,
    endWorkingAt: raw.end_working_at ?? null,
    priceMatch: Boolean(raw.price_match),
    minimumOrder: Number(raw.minimum_order) || 0,
    rate: Number(raw.rate) || 0,
    currency: String(raw.currency ?? 'SYP'),
    exchangeRate:
      raw.exchange_rate != null && Number.isFinite(exchangeRate) ? exchangeRate : null,
    isActive: Boolean(raw.is_active),
    phone: raw.phone ?? '',
    address: raw.address ?? '',
    contactEmail: raw.contact_email ?? '',
    createdAt: raw.created_at ?? '',
  }
}

/** Empty means use the system rate; otherwise OpenAPI requires 0 < rate < 10,000,000,000. */
export function isValidMallExchangeRateInput(value) {
  if (value == null || String(value).trim() === '') return true
  const rate = Number(value)
  return Number.isFinite(rate) && rate > 0 && rate < 10_000_000_000
}

export function mallExchangeRateForApi(value) {
  return value == null || String(value).trim() === '' ? null : Number(value)
}

/**
 * `is_active` is sent explicitly (default `true`) — without it, a newly created mall stayed
 * invisible on the public side until someone separately called toggleMallActive, the same
 * silent-inactive-default bug found on Stores.
 * @param {Record<string, unknown>} form
 */
export function buildMallCreatePayload(form) {
  return {
    name: String(form.name ?? '').trim(),
    start_working_at: String(form.start_working_at ?? '').trim(),
    end_working_at: String(form.end_working_at ?? '').trim(),
    email: String(form.email ?? '').trim(),
    password: String(form.password ?? ''),
    description: String(form.description ?? '').trim() || '',
    price_match: Boolean(form.price_match),
    minimum_order:
      form.minimum_order === '' || form.minimum_order == null
        ? 0
        : Number(form.minimum_order),
    phone: String(form.phone ?? '').trim() || '',
    address: String(form.address ?? '').trim() || '',
    contact_email: String(form.contact_email ?? '').trim() || '',
    is_active: form.is_active != null ? Boolean(form.is_active) : true,
  }
}

/**
 * @param {Record<string, unknown>} form
 */
export function buildMallUpdatePayload(form) {
  /** @type {Record<string, unknown>} */
  const payload = {
    name: form.name != null ? String(form.name).trim() || null : null,
    description: form.description != null ? String(form.description).trim() || null : null,
    start_working_at:
      form.start_working_at != null ? String(form.start_working_at).trim() || null : null,
    end_working_at:
      form.end_working_at != null ? String(form.end_working_at).trim() || null : null,
    price_match: form.price_match != null ? Boolean(form.price_match) : null,
    minimum_order:
      form.minimum_order === '' || form.minimum_order == null
        ? null
        : Number(form.minimum_order),
    phone: form.phone != null ? String(form.phone).trim() || null : null,
    address: form.address != null ? String(form.address).trim() || null : null,
    contact_email:
      form.contact_email != null ? String(form.contact_email).trim() || null : null,
    is_active: form.is_active != null ? Boolean(form.is_active) : null,
    // Mirrors Stores: currency travels on the main update payload, exchange_rate goes through
    // the dedicated PUT /api/malls/{id}/exchange-rate endpoint instead (see MallEditPage).
    currency: form.currency != null && form.currency !== '' ? String(form.currency).toUpperCase() : null,
  }
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const key of Object.keys(payload)) {
    if (payload[key] !== null && payload[key] !== undefined) out[key] = payload[key]
  }
  return out
}
