import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deliveredAtSortValue,
  deliveryDurationMinutes,
  partsDeliveryProgress,
  splitDuration,
} from '../src/utils/deliveryTime.js'
import { normalizeOrderDetail } from '../src/utils/orderDetail.js'

const delivered = {
  id: 9,
  status: 'delivered',
  created_at: '2026-11-26T09:00:00+00:00',
  delivered_at: '2026-11-26T10:35:00+00:00',
  stores: [
    { order_id: 9, status: 'delivered', delivered_at: '2026-11-26T10:00:00+00:00' },
    { order_id: 10, status: 'delivered', delivered_at: '2026-11-26T10:35:00+00:00' },
  ],
}

test('the order detail carries the cart and per-part delivery times', () => {
  const detail = normalizeOrderDetail(delivered)
  assert.equal(detail.deliveredAt, '2026-11-26T10:35:00+00:00')
  assert.equal(detail.parts[1].deliveredAt, '2026-11-26T10:35:00+00:00')
})

test('an undelivered order has no delivery time', () => {
  const detail = normalizeOrderDetail({ id: 3, status: 'preparing', created_at: '2026-11-26T09:00:00Z' })
  assert.equal(detail.deliveredAt, null)
})

test('delivery duration is counted from placing the order', () => {
  assert.equal(deliveryDurationMinutes(delivered.created_at, delivered.delivered_at), 95)
  assert.deepEqual(splitDuration(95), { days: 0, hours: 1, minutes: 35 })
  assert.deepEqual(splitDuration(1500), { days: 1, hours: 1, minutes: 0 })
  assert.equal(deliveryDurationMinutes(delivered.created_at, null), null)
  // A clock that reads delivered before placed is not shown as a negative time.
  assert.equal(deliveryDurationMinutes(delivered.delivered_at, delivered.created_at), null)
})

test('a split cart reports how many live parts are delivered', () => {
  assert.deepEqual(
    partsDeliveryProgress([
      { status: 'delivered' },
      { status: 'out_for_delivery' },
      { status: 'cancelled' },
    ]),
    { delivered: 1, total: 2 },
  )
})

test('undelivered orders sort after delivered ones', () => {
  assert.ok(deliveredAtSortValue(delivered.delivered_at) < deliveredAtSortValue(null))
})
