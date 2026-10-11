import assert from 'node:assert/strict'
import test from 'node:test'
import { CATEGORY_SCOPES } from '../src/models/Category.js'
import { categoryScopeForStoreType } from '../src/utils/categoryPicker.js'

test('each store type files its products under the backend section', () => {
  assert.equal(categoryScopeForStoreType('pharmacy'), 'pharmacy')
  assert.equal(categoryScopeForStoreType('restaurant'), 'restaurant')
  assert.equal(categoryScopeForStoreType('mall'), 'mall')
  assert.equal(categoryScopeForStoreType('syrian'), 'store')
  assert.equal(categoryScopeForStoreType('global'), 'store')
  assert.equal(categoryScopeForStoreType(null), undefined)
})

test('the pharmacy section is selectable in the categories page', () => {
  assert.ok(CATEGORY_SCOPES.includes('pharmacy'))
})
