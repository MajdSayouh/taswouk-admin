/**
 * Client-side helpers for dashboard tables (search + simple filters).
 */

/** @param {string} search */
export function normalizeSearch(search) {
  return String(search ?? '').trim().toLowerCase()
}

/**
 * True if any stringified field contains the search substring (case-insensitive).
 * @param {string} search — raw search box value
 * @param {unknown[]} fieldValues
 */
export function rowMatchesSearch(search, ...fieldValues) {
  const q = normalizeSearch(search)
  if (!q) return true
  return fieldValues.some((v) => String(v ?? '').toLowerCase().includes(q))
}

/**
 * @param {'all' | 'active' | 'inactive'} filter
 * @param {boolean} isActive
 */
export function matchesActiveTriState(filter, isActive) {
  if (filter === 'all') return true
  if (filter === 'active') return isActive === true
  return isActive === false
}

/**
 * @param {'all' | 'yes' | 'no'} filter
 * @param {boolean} value
 */
export function matchesYesNoTriState(filter, value) {
  if (filter === 'all') return true
  if (filter === 'yes') return value === true
  return value === false
}

/**
 * @param {string[]} selected — empty = show all
 * @param {string} status — lowercased order status
 */
export function matchesStatusMultiFilter(selected, status) {
  if (!selected || selected.length === 0) return true
  return selected.includes(String(status || '').toLowerCase())
}
