import assert from 'node:assert/strict'
import test from 'node:test'
import { excludeStoreTypes, filterStoresByType } from '../src/utils/storeFilters.js'

test('mall list scope includes only mall stores and counts only those rows', () => {
  const stores = [
    { id: 'mall-1', storeType: 'mall' },
    { id: 'store-1', storeType: 'global' },
    { id: 'mall-2', storeType: 'mall' },
    { id: 'restaurant-1', storeType: 'restaurant' },
  ]

  const malls = filterStoresByType(stores, 'mall')

  assert.deepEqual(
    malls.map((store) => store.id),
    ['mall-1', 'mall-2'],
  )
  assert.equal(malls.length, 2)
})

test('unfiltered store list retains all store types', () => {
  const stores = [{ id: 'mall-1', storeType: 'mall' }, { id: 'store-1', storeType: 'global' }]

  assert.equal(filterStoresByType(stores, null), stores)
})

test('the stores page leaves out types that have their own page', () => {
  const stores = [
    { id: 'store-1', storeType: 'global' },
    { id: 'restaurant-1', storeType: 'restaurant' },
    { id: 'pharmacy-1', storeType: 'pharmacy' },
    { id: 'untyped-1', storeType: null },
    { id: 'mall-1', storeType: 'mall' },
  ]

  assert.deepEqual(
    excludeStoreTypes(stores, ['restaurant', 'pharmacy']).map((store) => store.id),
    ['store-1', 'untyped-1', 'mall-1'],
  )
  assert.equal(excludeStoreTypes(stores, []), stores)
})
