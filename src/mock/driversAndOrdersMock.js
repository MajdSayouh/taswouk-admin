/**
 * Demo drivers used for assignment UI while driver APIs are still mocked.
 */

/** @typedef {{ id: string; name: string; phone: string; vehicle: string; active: boolean }} MockDriver */

/** @type {MockDriver[]} */
export const MOCK_DRIVERS = [
  { id: 'drv-1', name: 'Ahmed Al-Rashid', phone: '+966 50 111 2233', vehicle: 'Toyota Hiace', active: true },
  { id: 'drv-2', name: 'Sultan Al-Otaibi', phone: '+966 50 444 5566', vehicle: 'Ford Transit', active: true },
  { id: 'drv-3', name: 'Khalid Al-Mutairi', phone: '+966 50 777 8899', vehicle: 'Van', active: false },
]

export function getMockDriverById(id) {
  if (id == null || id === '') return null
  return MOCK_DRIVERS.find((d) => String(d.id) === String(id)) ?? null
}
