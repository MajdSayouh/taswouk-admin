// «نسبة العقد» (contract percent) form helpers — shared by the store create and edit pages.

/**
 * Parses the field's text into a percent the backend accepts (0–100, two decimals).
 * An empty field means 0. Returns null when the text is not a valid percent.
 * @param {string} value
 * @returns {number | null}
 */
export function parseContractPercentInput(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 0
  const percent = Number(trimmed)
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null
  return Math.round(percent * 100) / 100
}
