import assert from 'node:assert/strict'
import test from 'node:test'
import { storeSection } from '../src/views/stores/storeSections.js'

test('the pharmacies tab scopes the store pages to pharmacies', () => {
  const section = storeSection('pharmacy')
  assert.equal(section.storeType, 'pharmacy')
  assert.equal(section.path, '/pharmacies')
  assert.equal(section.i18n, 'pharmacies')
  assert.equal(section.showsHours, true)
  assert.equal(section.showsPreparation, false)
})

test('the restaurants tab keeps its path and columns', () => {
  const section = storeSection('restaurant')
  assert.equal(section.path, '/restaurants')
  assert.equal(section.showsPreparation, true)
})

test('no section is the plain stores pages', () => {
  const section = storeSection(null)
  assert.equal(section.storeType, null)
  assert.equal(section.path, '/stores')
  assert.equal(section.newKey, 'stores.list.newStore')
})
