import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeOrderDetail } from '../src/utils/orderDetail.js'
import { contractBreakdown } from '../src/utils/orderContract.js'

const adminCart = {
  id: 7,
  number: '#7',
  store_id: 1,
  store_name: 'متجر أ',
  order_type: 'store',
  status: 'pending',
  subtotal: 3850,
  total: 3850,
  store_subtotal: 3500,
  contract_amount: 350,
  items: [
    { id: 1, order_id: 7, product_id: 10, product_name: 'أ', product_price: 1100, store_price: 1000, quantity: 3, line_total: 3300 },
    { id: 2, order_id: 7, product_id: 11, product_name: 'ب', product_price: 275, store_price: 250, quantity: 2, line_total: 550 },
  ],
  stores: [
    { order_id: 7, order_type: 'store', store_name: 'متجر أ', status: 'pending', total: 3850, contract_percent: 10, store_subtotal: 3500, contract_amount: 350 },
  ],
}

test('each line carries its store price beside the customer price', () => {
  const detail = normalizeOrderDetail(adminCart)
  assert.equal(detail.items[0].storePrice, 1000)
  assert.equal(detail.items[0].productPrice, 1100)
  assert.equal(detail.items[1].storePrice, 250)
})

test('the breakdown names each store percent and the order total', () => {
  const contract = contractBreakdown(normalizeOrderDetail(adminCart))
  assert.deepEqual(contract.stores, [{ key: '7', name: 'متجر أ', percent: 10 }])
  assert.equal(contract.storeSubtotal, 3500)
  assert.equal(contract.amount, 350)
})

test('a multi-store cart lists one percent per store and skips a legacy mall part', () => {
  const contract = contractBreakdown(
    normalizeOrderDetail({
      ...adminCart,
      stores: [
        { order_id: 7, store_name: 'متجر أ', status: 'pending', total: 1, contract_percent: 10 },
        { order_id: 8, store_name: 'متجر ب', status: 'pending', total: 1, contract_percent: 0 },
        { order_id: 9, order_type: 'mall', moll_name: 'مول', status: 'pending', total: 1 },
      ],
    }),
  )
  assert.deepEqual(
    contract.stores.map((s) => [s.name, s.percent]),
    [['متجر أ', 10], ['متجر ب', 0]],
  )
})

test('a single split row reads its percent off the order', () => {
  const contract = contractBreakdown(
    normalizeOrderDetail({ ...adminCart, stores: undefined, contract_percent: 5 }),
  )
  assert.deepEqual(contract.stores, [{ key: '7', name: 'متجر أ', percent: 5 }])
})

test('nothing shows when the backend sent no contract figures (non-admin viewers)', () => {
  const { store_subtotal: _s, contract_amount: _a, ...plain } = adminCart
  const detail = normalizeOrderDetail({
    ...plain,
    items: plain.items.map(({ store_price: _p, ...item }) => item),
  })
  assert.equal(detail.items[0].storePrice, null)
  assert.equal(contractBreakdown(detail), null)
  assert.equal(contractBreakdown(null), null)
})
