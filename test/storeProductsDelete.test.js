import assert from 'node:assert/strict'
import test from 'node:test'
import { isDeleteConfirmed, toWesternDigits } from '../src/utils/storeProductsDelete.js'

test('Arabic and Persian digits read as Western digits', () => {
  assert.equal(toWesternDigits('١٢٠'), '120')
  assert.equal(toWesternDigits('۱۲۰'), '120')
  assert.equal(toWesternDigits(' 45 '), '45')
  assert.equal(toWesternDigits(null), '')
})

test('the typed figure must match the product count exactly', () => {
  assert.equal(isDeleteConfirmed('120', 120), true)
  assert.equal(isDeleteConfirmed('١٢٠', 120), true)
  assert.equal(isDeleteConfirmed('12', 120), false)
  assert.equal(isDeleteConfirmed('0120', 120), false)
  assert.equal(isDeleteConfirmed('', 120), false)
})

test('nothing to confirm for an empty store', () => {
  assert.equal(isDeleteConfirmed('0', 0), false)
  assert.equal(isDeleteConfirmed('', Number.NaN), false)
})
