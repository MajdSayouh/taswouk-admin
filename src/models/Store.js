/**
 * @typedef {Object} StoreRow
 * @property {string} id
 * @property {string} ownerId — seller user id (`seller_id` from API)
 * @property {string} name
 * @property {string} [ownerEmail] — `seller_email` from API
 * @property {string} [phone]
 * @property {string} [address]
 * @property {string} [description]
 * @property {number | null} exchangeRate
 * @property {boolean} isActive
 * @property {boolean} isBrand
 * @property {string} storeType
 * @property {string} currency
 * @property {string | null} startWorkingAt
 * @property {string | null} endWorkingAt
 * @property {number | null} preparationTime
 * @property {boolean} isOpenNow
 * @property {string} [createdAt]
 */

function parseExchangeRate(value) {
  if (value == null || value === '') return null
  const rate = Number(value)
  return Number.isFinite(rate) ? rate : null
}

export function mapStoreFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      ownerId: '',
      name: '—',
      ownerEmail: '',
      phone: '',
      address: '',
      description: '',
      exchangeRate: null,
      isActive: false,
      isBrand: false,
      storeType: 'global',
      currency: 'SYP',
      startWorkingAt: null,
      endWorkingAt: null,
      preparationTime: null,
      isOpenNow: true,
      createdAt: '',
    }
  }
  const sid = raw.seller_id ?? raw.owner_id
  const sem = raw.seller_email ?? raw.owner_email ?? raw.ownerEmail
  return {
    id: String(raw.id ?? ''),
    ownerId: sid != null ? String(sid) : '',
    name: raw.name ?? '—',
    ownerEmail: sem ?? '',
    phone: raw.phone ?? '',
    address: raw.address ?? '',
    description: raw.description ?? '',
    exchangeRate: parseExchangeRate(raw.exchange_rate ?? raw.exchangeRate),
    isActive: Boolean(raw.is_active),
    isBrand: Boolean(raw.is_brand),
    storeType: raw.store_type ?? 'global',
    currency: String(raw.currency ?? 'SYP').toUpperCase(),
    startWorkingAt: raw.start_working_at ?? null,
    endWorkingAt: raw.end_working_at ?? null,
    preparationTime:
      raw.preparation_time == null || raw.preparation_time === ''
        ? null
        : Number(raw.preparation_time),
    isOpenNow: raw.is_open_now !== false,
    createdAt: raw.created_at ?? '',
  }
}
