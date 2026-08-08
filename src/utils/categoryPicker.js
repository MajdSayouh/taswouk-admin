/**
 * Category/subcategory lists for product forms: only active rows are selectable,
 * except we keep the current assignment visible when editing a product tied to an inactive node.
 *
 * @typedef {import('../models/Category.js').CategoryModel} CategoryModel
 * @typedef {import('../models/Category.js').SubcategoryModel} SubcategoryModel
 */

function byName(a, b) {
  return String(a?.name ?? '').localeCompare(String(b?.name ?? ''))
}

/**
 * Top-level categories shown in product create/edit pickers.
 *
 * @param {CategoryModel[]} categories
 * @param {{ selectedCategoryId?: string }} [opts]
 * @returns {CategoryModel[]}
 */
export function categoriesForProductPicker(categories, opts = {}) {
  const list = Array.isArray(categories) ? categories : []
  const sel =
    opts.selectedCategoryId != null && opts.selectedCategoryId !== ''
      ? String(opts.selectedCategoryId)
      : ''
  const active = list.filter((c) => c.isActive)
  if (!sel) return [...active].sort(byName)
  const selected = list.find((c) => String(c.id) === sel)
  if (!selected || selected.isActive) return [...active].sort(byName)
  return [...active, selected].sort(byName)
}

/**
 * Subcategories for product pickers: subcategory active and parent category active.
 * When editing, includes the current subcategory row even if inactive or under inactive parent.
 *
 * @param {SubcategoryModel[]} subcategories
 * @param {CategoryModel[]} categories — full list (same source as admin tree)
 * @param {{ selectedSubcategoryId?: string }} [opts]
 * @returns {SubcategoryModel[]}
 */
export function subcategoriesForProductPicker(subcategories, categories, opts = {}) {
  const subs = Array.isArray(subcategories) ? subcategories : []
  const cats = Array.isArray(categories) ? categories : []
  const catById = new Map(cats.map((c) => [String(c.id), c]))

  const selSub =
    opts.selectedSubcategoryId != null && opts.selectedSubcategoryId !== ''
      ? String(opts.selectedSubcategoryId)
      : ''

  /** @param {SubcategoryModel} sc */
  function isSelectable(sc) {
    const parent = catById.get(String(sc.categoryId))
    return Boolean(sc.isActive && parent?.isActive)
  }

  const base = subs.filter(isSelectable)
  if (!selSub) return [...base].sort(byName)
  const selected = subs.find((sc) => String(sc.id) === selSub)
  if (!selected || base.some((sc) => String(sc.id) === selSub)) return [...base].sort(byName)
  return [...base, selected].sort(byName)
}
