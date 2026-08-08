/**
 * @typedef {{
 *   id: string
 *   name: string
 *   isActive: boolean
 *   logoUrl: string | null
 * }} CategoryModel
 */

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   categoryId: string
 *   categoryName: string
 *   isActive: boolean
 *   logoUrl: string | null
 * }} SubcategoryModel
 */

/**
 * @param {unknown} raw
 * @returns {CategoryModel | null}
 */
export function mapCategoryFromApi(raw) {
  if (raw == null || typeof raw !== 'object') return null
  const r = raw
  const id = r.id ?? r.category_id ?? r.categoryId
  if (id == null) return null
  return {
    id: String(id),
    name: String(r.name ?? r.title ?? '').trim() || `Category #${id}`,
    isActive: Boolean(r.is_active ?? r.active ?? true),
    logoUrl: r.logo ?? r.logo_url ?? null,
  }
}

/**
 * @param {unknown} raw
 * @returns {SubcategoryModel | null}
 */
export function mapSubcategoryFromApi(raw) {
  if (raw == null || typeof raw !== 'object') return null
  const r = raw
  const id = r.id ?? r.subcategory_id ?? r.sub_category_id ?? r.subCategoryId
  if (id == null) return null

  const cid =
    r.category_id ??
    r.categoryId ??
    r.parent_id ??
    r.parentId ??
    r.category?.id ??
    r.parent?.id ??
    ''
  const cname =
    r.category_name ??
    r.categoryName ??
    r.category?.name ??
    r.parent?.name ??
    ''

  return {
    id: String(id),
    name: String(r.name ?? r.title ?? '').trim() || `Subcategory #${id}`,
    categoryId: cid != null ? String(cid) : '',
    categoryName: String(cname || '').trim(),
    isActive: Boolean(r.is_active ?? r.active ?? true),
    logoUrl: r.logo ?? r.logo_url ?? null,
  }
}

function childNodes(node) {
  const c = node?.children ?? node?.sub_categories ?? node?.subcategories ?? node?.nodes
  return Array.isArray(c) ? c : []
}

/**
 * Flatten category tree endpoint into top-level categories + subcategories list.
 * Children at any depth are treated as subcategories linked to the top-level category.
 *
 * @param {unknown[]} rows
 */
export function flattenCategoryTree(rows) {
  const categories = []
  const subcategories = []

  function walk(node, rootCategory, depth) {
    if (node == null || typeof node !== 'object') return
    if (depth === 0) {
      const c = mapCategoryFromApi(node)
      if (!c) return
      categories.push(c)
      for (const ch of childNodes(node)) walk(ch, c, depth + 1)
      return
    }

    const sc = mapSubcategoryFromApi(node)
    if (sc) {
      subcategories.push({
        ...sc,
        categoryId: rootCategory?.id ?? sc.categoryId,
        categoryName: rootCategory?.name ?? sc.categoryName,
      })
    }
    for (const ch of childNodes(node)) walk(ch, rootCategory, depth + 1)
  }

  for (const row of Array.isArray(rows) ? rows : []) {
    walk(row, null, 0)
  }

  return { categories, subcategories }
}
