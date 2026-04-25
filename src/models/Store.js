/**
 * @typedef {Object} StoreRow
 * @property {string} id
 * @property {string} ownerId — seller user id (`seller_id` from API)
 * @property {string} name
 * @property {string} [ownerEmail] — `seller_email` from API
 * @property {string} [phone]
 * @property {string} [address]
 * @property {string} [description]
 * @property {boolean} isActive
 * @property {boolean} isBrand
 * @property {string} [createdAt]
 */

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
      isActive: false,
      isBrand: false,
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
    isActive: Boolean(raw.is_active),
    isBrand: Boolean(raw.is_brand),
    createdAt: raw.created_at ?? '',
  }
}
