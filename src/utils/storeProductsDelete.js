/**
 * Deleting every product of a store — `DELETE /api/stores/{id}/products`.
 *
 * It cannot be undone, so the confirmation asks the admin to type the number
 * of products being deleted: it forces them to read the figure, and unlike a
 * store name it is easy to type on an Arabic keyboard.
 */

const ARABIC_INDIC_ZERO = 0x0660
const EASTERN_ARABIC_INDIC_ZERO = 0x06f0

/**
 * The typed text as Western digits: an Arabic keyboard types ١٢٣ (or the
 * Persian ۱۲۳), which must count as 123.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function toWesternDigits(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - ARABIC_INDIC_ZERO))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - EASTERN_ARABIC_INDIC_ZERO))
}

/**
 * Whether the typed confirmation matches the number of products to delete.
 * A store with no products has nothing to confirm.
 *
 * @param {unknown} typed
 * @param {number} count
 * @returns {boolean}
 */
export function isDeleteConfirmed(typed, count) {
  if (!Number.isInteger(count) || count <= 0) return false
  return toWesternDigits(typed) === String(count)
}
