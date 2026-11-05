/**
 * A product has one primary category (the form's category / sub-category pair) and optional
 * extra ones. The API's `category_ids` is all of them, primary first.
 */

/** Matches MAX_PRODUCT_CATEGORIES on the backend. */
export const MAX_PRODUCT_CATEGORIES = 10

/**
 * @param {number | string | null | undefined} primaryId
 * @param {(number | string)[] | null | undefined} extraIds
 * @returns {number[]}
 */
export function productCategoryIds(primaryId, extraIds) {
  const ids = [primaryId, ...(Array.isArray(extraIds) ? extraIds : [])]
    .filter((id) => id != null && String(id).trim() !== '')
    .map(Number)
    .filter(Number.isFinite)
  return [...new Set(ids)]
}

/**
 * The primary's place matters and the extras' order does not.
 * @param {number[]} ids
 * @param {(number | string)[] | null | undefined} baselineIds
 */
export function categoryIdsChanged(ids, baselineIds) {
  const baseline = productCategoryIds(null, baselineIds)
  if (ids[0] !== baseline[0]) return true
  if (ids.length !== baseline.length) return true
  const known = new Set(baseline)
  return ids.some((id) => !known.has(id))
}

/**
 * For the form: `category_ids` without the primary, as the Select's string values.
 * @param {{ category_id?: unknown, category_ids?: unknown } | null | undefined} product
 * @returns {string[]}
 */
export function extraCategoryIdsFromApi(product) {
  const ids = Array.isArray(product?.category_ids) ? product.category_ids : []
  return ids.filter((id) => String(id) !== String(product?.category_id ?? '')).map(String)
}

/**
 * Every category the picker offers, sub-categories under their parent's name, minus the primary.
 * A saved extra that is no longer offered (deactivated, say) is kept so the Select shows a label
 * rather than a bare id.
 * @param {{
 *   categories: { id: unknown, name?: unknown }[]
 *   subcategories: { id: unknown, name?: unknown, categoryId?: unknown }[]
 *   primaryId?: unknown
 *   selectedIds?: unknown[]
 *   unavailableLabel: (id: string) => string
 * }} input
 * @returns {{ value: string, label: string }[]}
 */
export function extraCategoryOptions({ categories, subcategories, primaryId, selectedIds = [], unavailableLabel }) {
  const nameOf = new Map(categories.map((c) => [String(c.id), String(c.name ?? '')]))
  const options = [
    ...categories.map((c) => ({ value: String(c.id), label: String(c.name ?? '') })),
    ...subcategories.map((s) => {
      const parent = nameOf.get(String(s.categoryId ?? ''))
      const name = String(s.name ?? '')
      return { value: String(s.id), label: parent ? `${parent} > ${name}` : name }
    }),
  ].filter((option) => option.value !== String(primaryId ?? ''))
  const offered = new Set(options.map((option) => option.value))
  const missing = selectedIds
    .map(String)
    .filter((id) => !offered.has(id) && id !== String(primaryId ?? ''))
    .map((id) => ({ value: id, label: unavailableLabel(id) }))
  return [...options, ...missing]
}
