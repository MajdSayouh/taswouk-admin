import assert from 'node:assert/strict'
import test from 'node:test'
import { parseContractPercentInput } from '../src/views/stores/contractPercent.js'
import { mapStoreFromApi } from '../src/models/Store.js'

test('an empty contract percent field means 0', () => {
  assert.equal(parseContractPercentInput(''), 0)
  assert.equal(parseContractPercentInput('   '), 0)
  assert.equal(parseContractPercentInput(undefined), 0)
})

test('a valid percent is kept to two decimals', () => {
  assert.equal(parseContractPercentInput('10'), 10)
  assert.equal(parseContractPercentInput('2.5'), 2.5)
  assert.equal(parseContractPercentInput('7.456'), 7.46)
  assert.equal(parseContractPercentInput('100'), 100)
})

test('negative, above 100 or non-numeric percents are refused', () => {
  assert.equal(parseContractPercentInput('-1'), null)
  assert.equal(parseContractPercentInput('100.5'), null)
  assert.equal(parseContractPercentInput('abc'), null)
})

test('the store model carries the contract percent, 0 when absent', () => {
  assert.equal(mapStoreFromApi({ id: 1, contract_percent: 12.5 }).contractPercent, 12.5)
  assert.equal(mapStoreFromApi({ id: 1, contract_percent: null }).contractPercent, 0)
  assert.equal(mapStoreFromApi({ id: 1 }).contractPercent, 0)
  assert.equal(mapStoreFromApi(null).contractPercent, 0)
})
