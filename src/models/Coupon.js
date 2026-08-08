/**
 * @typedef {Object} CouponRow
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {number} discountPercent
 * @property {number | null} maxUses
 * @property {number} usesCount
 * @property {string | null} expiresAt — ISO string from API
 * @property {boolean} isActive
 * @property {string} createdAt
 */

export function mapCouponFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      code: '',
      name: '—',
      discountPercent: 0,
      maxUses: null,
      usesCount: 0,
      expiresAt: null,
      isActive: false,
      createdAt: '',
    }
  }
  return {
    id: String(raw.id ?? ''),
    code: String(raw.code ?? ''),
    name: raw.name ?? '—',
    discountPercent: Number(raw.discount_percent ?? 0),
    maxUses: raw.max_uses != null ? Number(raw.max_uses) : null,
    usesCount: Number(raw.uses_count ?? 0),
    expiresAt: raw.expires_at != null ? String(raw.expires_at) : null,
    isActive: Boolean(raw.is_active),
    createdAt: raw.created_at != null ? String(raw.created_at) : '',
  }
}
