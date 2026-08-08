/**
 * External shop — ExternalShopOut / ExternalShopIn.
 * @see https://test.taswouk.com/api/docs#/External%20Shops
 */

/**
 * @typedef {Object} ExternalShopRow
 * @property {string} id
 * @property {string} name
 * @property {string | null} logoUrl
 * @property {string} baseUrl
 * @property {boolean} isActive
 * @property {boolean} requiresVpn
 */

/**
 * @param {unknown} raw
 * @returns {ExternalShopRow}
 */
export function mapExternalShopFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      logoUrl: null,
      baseUrl: '',
      isActive: false,
      requiresVpn: false,
    }
  }
  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? '',
    logoUrl: raw.logo ?? raw.logo_url ?? null,
    baseUrl: raw.base_url ?? '',
    isActive: Boolean(raw.is_active),
    requiresVpn: Boolean(raw.requires_vpn),
  }
}

/**
 * @param {Record<string, unknown>} form
 */
export function buildExternalShopCreatePayload(form) {
  return {
    name: String(form.name ?? '').trim(),
    base_url: String(form.base_url ?? '').trim(),
    is_active: form.is_active != null ? Boolean(form.is_active) : true,
    requires_vpn: Boolean(form.requires_vpn),
  }
}

/**
 * @param {Record<string, unknown>} form
 */
export function buildExternalShopUpdatePayload(form) {
  return {
    name: String(form.name ?? '').trim(),
    base_url: String(form.base_url ?? '').trim(),
    is_active: Boolean(form.is_active),
    requires_vpn: Boolean(form.requires_vpn),
  }
}

/**
 * Toggle helpers for list inline switches.
 * @param {ExternalShopRow} row
 * @param {boolean} isActive
 */
export function buildExternalShopActivePayload(row, isActive) {
  return {
    name: row.name,
    base_url: row.baseUrl,
    is_active: isActive,
    requires_vpn: row.requiresVpn,
  }
}
