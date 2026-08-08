/**
 * Delivery drivers — GET /api/accounts/admin/users/role/DELIVERY (admin JWT).
 */
import { useQuery } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { queryKeys } from '../query/queryKeys.js'

/**
 * @param {unknown} u
 * @returns {string}
 */
export function deliveryUserDisplayName(u) {
  const a = [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim()
  if (a) return a
  if (typeof u?.email === 'string' && u.email.trim()) return u.email.trim()
  return '—'
}

/**
 * @param {unknown} u
 */
export function mapDeliveryUserToDriverRow(u) {
  return {
    id: String(u.id),
    name: deliveryUserDisplayName(u),
    phone: typeof u.phone === 'string' && u.phone.trim() ? u.phone : '—',
    vehicle: u.vehicle_type != null && String(u.vehicle_type).trim() ? String(u.vehicle_type) : '—',
    active: Boolean(u.is_active),
  }
}

/**
 * @param {{ fetchOnMount?: boolean }} [options]
 */
export function useDriversViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false

  const listQuery = useQuery({
    queryKey: queryKeys.drivers.all(),
    queryFn: async () => {
      const raw = await adminService.listAdminUsersByRole('DELIVERY')
      const users = Array.isArray(raw?.users)
        ? raw.users
        : Array.isArray(raw)
          ? raw
          : []
      const serverCount = typeof raw?.count === 'number' ? raw.count : users.length
      return {
        rows: users.map(mapDeliveryUserToDriverRow),
        totalCount: serverCount,
      }
    },
    enabled: fetchOnMount,
  })

  const payload = listQuery.data
  const drivers = payload?.rows ?? []

  return {
    drivers,
    totalCount: payload?.totalCount ?? drivers.length,
    loading: fetchOnMount && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
  }
}
