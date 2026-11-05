import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSupplierSources, safeHttpUrl, whatsappUrl } from '../src/utils/supplierSources.js'

const row = (overrides = {}) => ({
  item_id: 1,
  store_id: 7,
  store_name: 'بوتيك الشام',
  merchant_whatsapp: '963991000000',
  source_store_url: 'https://www.sindbadsa.com/store/boutique-sham',
  product_url: 'https://www.sindbadsa.com/store/boutique-sham?p=a',
  ...overrides,
})

test('only http(s) links survive', () => {
  assert.equal(safeHttpUrl('https://a.test/x'), 'https://a.test/x')
  assert.equal(safeHttpUrl('javascript:alert(1)'), '')
  assert.equal(safeHttpUrl(null), '')
})

test('a whatsapp link holds digits only', () => {
  assert.equal(whatsappUrl('+963 991-000'), 'https://wa.me/963991000')
  assert.equal(whatsappUrl(''), '')
  assert.equal(whatsappUrl(null), '')
})

test('a store appears once however many lines it has', () => {
  const { stores, byItemId } = normalizeSupplierSources([
    row(),
    row({ item_id: 2, product_url: 'https://www.sindbadsa.com/store/boutique-sham?p=b' }),
    row({ item_id: 3, store_id: 8, store_name: 'آخر' }),
  ])
  assert.deepEqual(stores.map((s) => s.storeName), ['بوتيك الشام', 'آخر'])
  assert.equal(byItemId.get('2'), 'https://www.sindbadsa.com/store/boutique-sham?p=b')
})

test('a line without a usable link still names the merchant', () => {
  const { stores, byItemId } = normalizeSupplierSources([row({ product_url: null })])
  assert.equal(byItemId.size, 0)
  assert.equal(stores[0].whatsappUrl, 'https://wa.me/963991000000')
})

test('anything but a list is empty', () => {
  assert.deepEqual(normalizeSupplierSources(undefined).stores, [])
})
