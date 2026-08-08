/**
 * @typedef {Object} SellerRow
 * @property {string} id
 * @property {string} email
 * @property {string} [phone]
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [role]
 * @property {boolean} isActive
 * @property {boolean} isVerified
 * @property {string} [governorate]
 */

/**
 * @param {unknown} raw — UserProfileSchema or similar from admin list/create/update.
 * @returns {SellerRow}
 */
export function mapSellerFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      email: '',
      phone: '',
      firstName: '',
      lastName: '',
      role: '',
      isActive: false,
      isVerified: false,
      governorate: '',
    }
  }
  return {
    id: String(raw.id ?? ''),
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    firstName: raw.first_name ?? '',
    lastName: raw.last_name ?? '',
    role: raw.role ?? '',
    isActive: Boolean(raw.is_active),
    isVerified: Boolean(raw.is_verified),
    governorate: raw.governorate ?? '',
  }
}

/**
 * @param {Record<string, unknown>} form
 * @returns {Parameters<import('../services/adminService.js').updateSeller>[1]}
 */
export function buildSellerUpdatePayload(form) {
  const email = String(form.email ?? '').trim()
  const phoneTrim = String(form.phone ?? '').trim()
  const phone = phoneTrim.length === 0 ? null : phoneTrim.length === 10 ? phoneTrim : null
  const first = String(form.first_name ?? '').trim()
  const last = String(form.last_name ?? '').trim()

  return {
    email: email.length ? email : null,
    phone,
    first_name: first.length ? first : null,
    last_name: last.length ? last : null,
    is_active: form.is_active != null ? Boolean(form.is_active) : null,
    is_verified: form.is_verified != null ? Boolean(form.is_verified) : null,
  }
}
