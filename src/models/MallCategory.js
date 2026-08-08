/**
 * Mall category tree — MallCategorySummarySchema / MallCategoryCreateSchema.
 * @see https://test.taswouk.com/api/docs#/Mall%20Categories
 */

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   description: string
 *   isActive: boolean
 *   logoUrl: string | null
 * }} MallCategoryModel
 */

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   description: string
 *   categoryId: string
 *   categoryName: string
 *   isActive: boolean
 *   logoUrl: string | null
 * }} MallSubcategoryModel
 */

/**
 * @param {unknown} raw
 * @returns {MallCategoryModel | null}
 */
export function mapMallCategoryFromApi(raw) {
  if (raw == null || typeof raw !== 'object') return null
  const r = raw
  const id = r.id ?? r.category_id ?? r.categoryId
  if (id == null) return null
  return {
    id: String(id),
    name: String(r.name ?? r.title ?? '').trim() || `Category #${id}`,
    description: String(r.description ?? '').trim(),
    isActive: Boolean(r.is_active ?? r.active ?? true),
    logoUrl: r.logo ?? r.logo_url ?? null,
  }
}

/**
 * @param {unknown} raw
 * @returns {MallSubcategoryModel | null}
 */
export function mapMallSubcategoryFromApi(raw) {
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
    description: String(r.description ?? '').trim(),
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
 * Flatten mall category tree into top-level categories + subcategories.
 *
 * @param {unknown[]} rows
 */
export function flattenMallCategoryTree(rows) {
  const categories = []
  const subcategories = []

  function walk(node, rootCategory, depth) {
    if (node == null || typeof node !== 'object') return
    if (depth === 0) {
      const c = mapMallCategoryFromApi(node)
      if (!c) return
      categories.push(c)
      for (const ch of childNodes(node)) walk(ch, c, depth + 1)
      return
    }

    const sc = mapMallSubcategoryFromApi(node)
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
