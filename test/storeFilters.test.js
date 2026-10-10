import assert from 'node:assert/strict'
import test from 'node:test'
import { filterStoresByType } from '../src/utils/storeFilters.js'

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
