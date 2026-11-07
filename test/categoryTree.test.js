import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_CATEGORY_LEVELS,
  canAddChild,
  filterTree,
  findNode,
  heightOf,
  mapCategoryTree,
  placementOptions,
  reorderedSiblingIds,
} from '../src/models/CategoryTree.js'

// إلكترونيات > هواتف > ذكية      ملابس > رجالي
const RAW = [
  {
    id: 1, name: 'إلكترونيات', scope: 'store', is_active: true, sort_order: 1,
    sub_categories: [
      { id: 2, name: 'هواتف', parent_id: 1, sub_categories: [{ id: 3, name: 'ذكية', parent_id: 2 }] },
    ],
  },
  { id: 4, name: 'ملابس', is_active: false, sub_categories: [{ id: 5, name: 'رجالي' }] },
]

function flatOptions(options) {
  const out = {}
  const walk = (list) => list.forEach((o) => { out[o.value] = o.disabled; walk(o.children) })
  walk(options)
  return out
}

test('depth and parent come from the nesting, at every level', () => {
  const tree = mapCategoryTree(RAW)
  const smart = findNode(tree, 3)
  assert.equal(smart.depth, 2)
  assert.equal(smart.parentId, '2')
  assert.equal(MAX_CATEGORY_LEVELS, 3)
  assert.equal(canAddChild(smart), false)
  assert.equal(canAddChild(findNode(tree, 2)), true)
})

test('a category cannot be placed inside itself or too deep', () => {
  const tree = mapCategoryTree(RAW)
  const phones = findNode(tree, 2) // has one level beneath
  const opts = flatOptions(placementOptions(tree, phones, { rootLabel: 'root' }))
  assert.equal(opts.__root__, false)
  assert.equal(opts['1'], false) // under a root: depth 1 + 1 level = 2, ok
  assert.equal(opts['2'], true) // itself
  assert.equal(opts['3'], true) // its own child
  assert.equal(opts['5'], true) // depth 1 → would reach depth 3
})

test('a new category can go under any node above the last level', () => {
  const tree = mapCategoryTree(RAW)
  const opts = flatOptions(placementOptions(tree, null, { rootLabel: 'root' }))
  assert.equal(opts['2'], false)
  assert.equal(opts['3'], true)
})

test('reassignment targets allow every depth but skip inactive and excluded', () => {
  const tree = mapCategoryTree(RAW)
  const opts = flatOptions(
    placementOptions(tree, null, { asTargets: true, onlyActive: true, excludeIds: new Set(['3']) }),
  )
  assert.equal(opts.__root__, undefined)
  assert.equal(opts['2'], false)
  assert.equal(opts['3'], true)
  assert.equal(opts['4'], true) // inactive
})

test('reorder swaps with the neighbour and stops at the ends', () => {
  const tree = mapCategoryTree(RAW)
  assert.deepEqual(reorderedSiblingIds(tree, findNode(tree, 4), -1), ['4', '1'])
  assert.equal(reorderedSiblingIds(tree, findNode(tree, 4), 1), null)
  assert.equal(reorderedSiblingIds(tree, findNode(tree, 3), 1), null)
})

test('search keeps ancestors of a match', () => {
  const tree = mapCategoryTree(RAW)
  const out = filterTree(tree, 'ذكية')
  assert.equal(out.length, 1)
  assert.equal(out[0].children[0].children[0].id, '3')
  assert.equal(heightOf(tree[0]), 2)
})
