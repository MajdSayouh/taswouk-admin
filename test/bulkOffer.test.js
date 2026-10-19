import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildBulkOfferPayload,
  normalizeBulkOfferResult,
  parseBulkOfferValue,
} from '../src/utils/bulkOffer.js'

test('a percentage must sit strictly between 0 and 100', () => {
  assert.equal(parseBulkOfferValue('percent', 15), 15)
  assert.equal(parseBulkOfferValue('percent', '12,5'), 12.5)
  assert.equal(parseBulkOfferValue('percent', 0), null)
  assert.equal(parseBulkOfferValue('percent', 100), null)
  assert.equal(parseBulkOfferValue('percent', ''), null)
  assert.equal(parseBulkOfferValue('percent', 'abc'), null)
})

test('an amount only has to be positive', () => {
  assert.equal(parseBulkOfferValue('amount', 2500), 2500)
  assert.equal(parseBulkOfferValue('amount', -1), null)
  assert.equal(parseBulkOfferValue('other', 5), null)
})

test('the payload carries ids once each, as numbers, and only what the action needs', () => {
  assert.deepEqual(
    buildBulkOfferPayload({ productIds: ['3', 3, 7], action: 'apply', discountType: 'percent', value: 10 }),
    { product_ids: [3, 7], action: 'apply', discount_type: 'percent', value: 10 },
  )
  assert.deepEqual(buildBulkOfferPayload({ productIds: [1], action: 'remove', value: 9 }), {
    product_ids: [1],
    action: 'remove',
  })
})

test('a result without skips or with odd shapes still normalizes', () => {
  assert.deepEqual(normalizeBulkOfferResult({ updated: [1, 2] }), { updated: [1, 2], skipped: [] })
  assert.deepEqual(normalizeBulkOfferResult(null), { updated: [], skipped: [] })
  assert.deepEqual(
    normalizeBulkOfferResult({ updated: [], skipped: [{ id: 4, reason: 'x' }] }).skipped,
    [{ id: 4, name: '', reason: 'x' }],
  )
})
