import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeProductWritePayload } from '../src/utils/productWritePayload.js'

test('sanitize keeps category_ids so a changed sub-category reaches the API', () => {
  assert.deepEqual(sanitizeProductWritePayload({ name: 'x', category_ids: [12, 30] }), {
    name: 'x',
    category_ids: [12, 30],
  })
})

test('sanitize still strips UI-only category fields', () => {
  assert.deepEqual(
    sanitizeProductWritePayload({ category_id: 12, subCategoryId: '12', sub_category: 'y' }),
    { category_id: 12 },
  )
})
