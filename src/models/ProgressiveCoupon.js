/**
 * @typedef {Object} ProgressiveCouponRow
 * @property {string} id
 * @property {string} code
 * @property {boolean} isActive
 * @property {number} totalActivations
 */

/** API only returns `{ id, code, is_active, total_activations }` — tiers aren't returned after creation. */
export function mapProgressiveCouponFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return { id: '', code: '', isActive: false, totalActivations: 0 }
  }
  return {
    id: String(raw.id ?? ''),
    code: String(raw.code ?? ''),
    isActive: Boolean(raw.is_active),
    totalActivations: Number(raw.total_activations ?? 0),
  }
}

/**
 * @typedef {Object} ProgressiveCouponStatsRow
 * @property {string} userPhone
 * @property {number} currentTier
 * @property {number} usedCount
 * @property {boolean} isExpired
 */

export function mapProgressiveCouponStatsFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return { userPhone: '—', currentTier: 0, usedCount: 0, isExpired: false }
  }
  return {
    userPhone: String(raw.user_phone ?? '—'),
    currentTier: Number(raw.current_tier ?? 0),
    usedCount: Number(raw.used_count ?? 0),
    isExpired: Boolean(raw.is_expired),
  }
}
