import assert from 'node:assert/strict'
import test from 'node:test'
import {
  driverState,
  elapsedParts,
  haversineMeters,
  isRouteLive,
  minutesBetween,
  routeDistanceMeters,
  sortDrivers,
  stateMatchesFilter,
} from '../src/utils/liveDrivers.js'

const fresh = { is_stale: false, seconds_since_update: 5 }

test('a lost signal outranks being on the road', () => {
  assert.equal(driverState({ location: null, on_the_road: true }), 'noLocation')
  assert.equal(driverState({ location: { is_stale: true }, on_the_road: true }), 'stale')
  assert.equal(driverState({ location: fresh, on_the_road: true, open_orders: [{}] }), 'onTheRoad')
  assert.equal(driverState({ location: fresh, on_the_road: false, open_orders: [{}] }), 'assigned')
  assert.equal(driverState({ location: fresh, on_the_road: false, open_orders: [] }), 'available')
})

test('the available filter leaves out drivers who already hold an order', () => {
  assert.equal(stateMatchesFilter('available', 'assigned'), false)
  assert.equal(stateMatchesFilter('available', 'available'), true)
  assert.equal(stateMatchesFilter('all', 'noLocation'), true)
})

test('drivers sort by state, then by the freshest position', () => {
  const sorted = sortDrivers([
    { name: 'never', location: null },
    { name: 'idle-old', location: { is_stale: false, seconds_since_update: 50 } },
    { name: 'road', location: fresh, on_the_road: true },
    { name: 'idle-new', location: { is_stale: false, seconds_since_update: 3 } },
    { name: 'lost', location: { is_stale: true, seconds_since_update: 900 } },
  ])
  assert.deepEqual(
    sorted.map((d) => d.name),
    ['road', 'idle-new', 'idle-old', 'lost', 'never'],
  )
})

test('elapsed time picks the largest whole unit', () => {
  assert.deepEqual(elapsedParts(6), { value: 6, unit: 'seconds' })
  assert.deepEqual(elapsedParts(14 * 60 + 30), { value: 14, unit: 'minutes' })
  assert.deepEqual(elapsedParts(3 * 3600), { value: 3, unit: 'hours' })
  assert.deepEqual(elapsedParts(2 * 86400 + 5), { value: 2, unit: 'days' })
  assert.equal(elapsedParts(null), null)
})

test('route distance sums the legs between consecutive points', () => {
  const a = { latitude: 34.7302, longitude: 36.7155 }
  const b = { latitude: 34.7213, longitude: 36.7101 }
  const leg = haversineMeters(a, b)
  assert.ok(leg > 1000 && leg < 1200, `unexpected leg ${leg}`)
  assert.equal(Math.round(routeDistanceMeters([a, b, a])), Math.round(leg * 2))
  assert.equal(routeDistanceMeters([a]), 0)
})

test('trip duration is whole minutes and refuses bad input', () => {
  assert.equal(minutesBetween('2026-10-14T16:20:05+00:00', '2026-10-14T16:31:40+00:00'), 12)
  assert.equal(minutesBetween(null, '2026-10-14T16:31:40+00:00'), null)
  assert.equal(minutesBetween('2026-10-14T17:00:00Z', '2026-10-14T16:00:00Z'), null)
})

test('only an out-for-delivery route keeps polling', () => {
  assert.equal(isRouteLive({ status: 'out_for_delivery' }), true)
  assert.equal(isRouteLive({ status: 'delivered' }), false)
  assert.equal(isRouteLive(null), false)
})
