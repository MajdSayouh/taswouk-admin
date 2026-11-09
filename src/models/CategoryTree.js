/**
 * The category tree as the dashboard's management page sees it: nested, one
 * section (scope) at a time, every depth kept.
 *
 * `flattenCategoryTree` (models/Category.js) folds every level under its root,
 * which is what the product pickers want but not what a tree editor can use:
 * a third-level category edited through it was saved back under the root.
 */

/** Root > sub > sub-sub (owner's decision, 2026-11-07). Depth counts from 0. */
export const MAX_CATEGORY_LEVELS = 3

/**
 * @typedef {{
 *   id: string
 *   name: string
 *   logoUrl: string | null
 *   isActive: boolean
 *   scope: string
 *   parentId: string | null
 *   depth: number
 *   path: string[]
 *   sortOrder: number
 *   productCount: number | null
 *   totalProductCount: number | null
 *   children: CategoryNode[]
 * }} CategoryNode
 */

/**
 * @param {unknown} raw
 * @param {number} [depth]
 * @param {string | null} [parentId]
 * @returns {CategoryNode | null}
 */
export function mapCategoryNode(raw, depth = 0, parentId = null) {
  if (raw == null || typeof raw !== 'object') return null
  const r = /** @type {Record<string, any>} */ (raw)
  if (r.id == null) return null
  const id = String(r.id)
  const kids = Array.isArray(r.sub_categories) ? r.sub_categories : Array.isArray(r.children) ? r.children : []
  return {
    id,
    name: String(r.name ?? '').trim() || `#${id}`,
    logoUrl: r.logo ?? null,
    isActive: r.is_active !== false,
    scope: String(r.scope ?? 'store'),
    // Taken from the nesting, not from `parent_id`: a node whose parent the
    // server filtered out comes back as a root of what remains.
    parentId,
    depth,
    path: Array.isArray(r.path) ? r.path.map(String) : [],
    sortOrder: Number(r.sort_order ?? 0),
    productCount: r.product_count == null ? null : Number(r.product_count),
    totalProductCount: r.total_product_count == null ? null : Number(r.total_product_count),
    children: kids.map((k) => mapCategoryNode(k, depth + 1, id)).filter(Boolean),
  }
}

/** @param {unknown[]} rows */
export function mapCategoryTree(rows) {
  return (Array.isArray(rows) ? rows : []).map((r) => mapCategoryNode(r)).filter(Boolean)
}

/**
 * @param {CategoryNode[]} nodes
 * @param {(n: CategoryNode) => void} fn
 */
export function walkTree(nodes, fn) {
  for (const n of nodes) {
    fn(n)
    walkTree(n.children, fn)
  }
}

/** @param {CategoryNode[]} nodes @param {string | number | null | undefined} id */
export function findNode(nodes, id) {
  if (id == null) return null
  const key = String(id)
  let found = null
  walkTree(nodes, (n) => {
    if (!found && n.id === key) found = n
  })
  return found
}

/** Ids of the node and everything beneath it. @param {CategoryNode} node */
export function subtreeIds(node) {
  const out = new Set()
  walkTree([node], (n) => out.add(n.id))
  return out
}

/** Levels hanging under the node: 0 for a leaf. @param {CategoryNode} node */
export function heightOf(node) {
  if (!node.children.length) return 0
  return 1 + Math.max(...node.children.map(heightOf))
}

/**
 * The node's siblings in display order (including itself).
 * @param {CategoryNode[]} tree
 * @param {CategoryNode} node
 */
export function siblingsOf(tree, node) {
  if (node.parentId == null) return tree
  return findNode(tree, node.parentId)?.children ?? []
}

/**
 * The sibling ids after moving `node` one step up (-1) or down (+1), or null
 * when it is already at that end.
 * @param {CategoryNode[]} tree
 * @param {CategoryNode} node
 * @param {-1 | 1} step
 */
export function reorderedSiblingIds(tree, node, step) {
  const ids = siblingsOf(tree, node).map((n) => n.id)
  const i = ids.indexOf(node.id)
  const j = i + step
  if (i < 0 || j < 0 || j >= ids.length) return null
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  return ids
}

/**
 * Keep the nodes whose name or id matches, plus their ancestors (so the match
 * stays reachable) and their whole subtree.
 * @param {CategoryNode[]} nodes
 * @param {string} query
 * @returns {CategoryNode[]}
 */
export function filterTree(nodes, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return nodes
  /** @returns {CategoryNode | null} */
  const visit = (n) => {
    if (n.name.toLowerCase().includes(q) || n.id === q) return n
    const kids = n.children.map(visit).filter(Boolean)
    return kids.length ? { ...n, children: kids } : null
  }
  return nodes.map(visit).filter(Boolean)
}

/**
 * Where `moving` may be placed, as antd TreeSelect data. Only this section's
 * tree is passed in, so another section's categories are never offered.
 *
 * Disabled: the node itself and its descendants (a cycle), and any parent
 * that would push its deepest descendant past `MAX_CATEGORY_LEVELS`. With no
 * `moving` (a new category) only the depth rule applies.
 *
 * @param {CategoryNode[]} tree
 * @param {CategoryNode | null} moving
 * @param {{ rootLabel?: string, onlyActive?: boolean, excludeIds?: Set<string>, asTargets?: boolean }} [opts]
 *   `asTargets`: for reassigning products rather than placing a category --
 *   every depth is allowed and the root option is left out.
 */
export function placementOptions(tree, moving, opts = {}) {
  const blocked = moving ? subtreeIds(moving) : new Set()
  const extra = moving ? heightOf(moving) : 0
  const exclude = opts.excludeIds ?? new Set()
  /** @param {CategoryNode} n */
  const toOption = (n) => {
    const tooDeep = !opts.asTargets && n.depth + 1 + extra > MAX_CATEGORY_LEVELS - 1
    const inactive = Boolean(opts.onlyActive) && !n.isActive
    return {
      value: n.id,
      title: n.name,
      disabled: Boolean(blocked.has(n.id) || exclude.has(n.id) || tooDeep || inactive),
      children: n.children.map(toOption),
    }
  }
  const options = tree.map(toOption)
  if (opts.asTargets || opts.rootLabel == null) return options
  return [{ value: '__root__', title: opts.rootLabel, disabled: false, children: [] }, ...options]
}

export const ROOT_PARENT_VALUE = '__root__'

/** The table's nested-rows field; see `toCategoryRows`. */
export const CATEGORY_ROW_CHILDREN = 'childRows'

/**
 * Tree nodes as antd table rows. antd draws an expand arrow for an empty array,
 * so leaves must have no nested rows -- but they go in their own field, because
 * each row is also the node handed to the columns and dialogs, which rely on
 * `children` always being an array.
 * @param {CategoryNode[]} nodes
 */
export function toCategoryRows(nodes) {
  return nodes.map((n) => ({
    ...n,
    key: n.id,
    [CATEGORY_ROW_CHILDREN]: n.children.length ? toCategoryRows(n.children) : undefined,
  }))
}

/** May a child be added under this node? @param {CategoryNode} node */
export function canAddChild(node) {
  return node.depth < MAX_CATEGORY_LEVELS - 1
}
