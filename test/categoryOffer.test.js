import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCategoryOfferPayload } from '../src/utils/categoryOffer.js'

test('apply sends the percentage; subcategories are included unless turned off', () => {
  assert.deepEqual(buildCategoryOfferPayload({ categoryId: '4', action: 'apply', percent: 15 }), {
    category_id: 4,
    action: 'apply',
    include_subcategories: true,
    percent: 15,
  })
  assert.equal(
    buildCategoryOfferPayload({ categoryId: 4, action: 'apply', percent: 15, includeSubcategories: false })
      .include_subcategories,
    false,
  )
})

test('remove carries no percentage', () => {
  assert.deepEqual(buildCategoryOfferPayload({ categoryId: 4, action: 'remove', percent: 9 }), {
    category_id: 4,
    action: 'remove',
    include_subcategories: true,
  })
})

test('a store narrows the request only when one is chosen', () => {
  assert.equal(buildCategoryOfferPayload({ categoryId: 4, action: 'remove', storeId: '12' }).store_id, 12)
  assert.equal('store_id' in buildCategoryOfferPayload({ categoryId: 4, action: 'remove', storeId: null }), false)
  assert.equal('store_id' in buildCategoryOfferPayload({ categoryId: 4, action: 'remove', storeId: '' }), false)
})
