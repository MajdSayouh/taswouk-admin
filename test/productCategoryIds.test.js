import assert from 'node:assert/strict'
import test from 'node:test'
import {
  categoryIdsChanged,
  extraCategoryIdsFromApi,
  extraCategoryOptions,
  productCategoryIds,
} from '../src/utils/productCategoryIds.js'

test('the primary leads and nothing repeats', () => {
  assert.deepEqual(productCategoryIds('5', ['7', '5', 9]), [5, 7, 9])
  assert.deepEqual(productCategoryIds(null, ['7']), [7])
  assert.deepEqual(productCategoryIds('', null), [])
})

test('reordering the extras is not a change, moving the primary is', () => {
  assert.equal(categoryIdsChanged([1, 2, 3], [1, 3, 2]), false)
  assert.equal(categoryIdsChanged([2, 1, 3], [1, 2, 3]), true)
  assert.equal(categoryIdsChanged([1, 2], [1, 2, 3]), true)
  assert.equal(categoryIdsChanged([1, 4], [1, 2]), true)
  assert.equal(categoryIdsChanged([], []), false)
})

test('the form takes the extras only', () => {
  assert.deepEqual(extraCategoryIdsFromApi({ category_id: 1, category_ids: [1, 2, 3] }), ['2', '3'])
  assert.deepEqual(extraCategoryIdsFromApi({ category_id: 1 }), [])
  assert.deepEqual(extraCategoryIdsFromApi(null), [])
})

const input = {
  categories: [{ id: 1, name: 'ملابس' }, { id: 2, name: 'أحذية' }],
  subcategories: [{ id: 3, name: 'فساتين', categoryId: 1 }],
  unavailableLabel: (id) => `#${id}`,
}

test('a sub-category reads under its parent and the primary is not offered twice', () => {
  const options = extraCategoryOptions({ ...input, primaryId: 2 })
  assert.deepEqual(options, [
    { value: '1', label: 'ملابس' },
    { value: '3', label: 'ملابس > فساتين' },
  ])
})

test('a saved extra that is no longer offered keeps a label', () => {
  const options = extraCategoryOptions({ ...input, primaryId: 2, selectedIds: ['99', '2'] })
  assert.deepEqual(options.at(-1), { value: '99', label: '#99' })
  assert.equal(options.filter((o) => o.value === '2').length, 0)
})
