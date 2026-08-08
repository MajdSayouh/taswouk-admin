/**
 * Users-by-role ViewModel — server-side paginated list for one role.
 *
 * Backs the Users > Customers/Sellers/Delivery/Admins sidebar tabs. Calls
 * `GET /api/accounts/admin/users/role/{role}?page&page_size` and expects the
 * paginated shape the backend team agreed to ship: `{ items, total, page, page_size }`
 * (see adminService.PaginatedUserListSchema). Until that lands, the backend may still
 * return a flat, uncounted list — in that case `total` falls back to the current
 * page's length, so pagination controls just won't show a page beyond what's returned.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { queryKeys } from '../query/queryKeys.js'

export const DEFAULT_USERS_PAGE_SIZE = 50

function extractItems(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.users)) return raw.users
  if (Array.isArray(raw?.results)) return raw.results
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function extractTotal(raw, fallback) {
  const candidate = raw?.total ?? raw?.count ?? raw?.total_count
  return typeof candidate === 'number' ? candidate : fallback
}

/**
 * @param {'ADMIN' | 'CUSTOMER' | 'SELLER' | 'DELIVERY'} role
 * @param {{ pageSize?: number }} [options]
 */
export function useUsersByRoleViewModel(role, options = {}) {
  const pageSize = options.pageSize ?? DEFAULT_USERS_PAGE_SIZE
  const [page, setPage] = useState(1)

  const listQuery = useQuery({
    queryKey: queryKeys.adminUsers.byRole(role, page, pageSize),
    queryFn: async ({ signal }) => {
      const raw = await adminService.listAdminUsersByRole(role, {
        signal,
        page,
        page_size: pageSize,
      })
      const items = extractItems(raw).map((u) => ({ ...u, role: u?.role || role }))
      return { items, total: extractTotal(raw, items.length) }
    },
    placeholderData: (prev) => prev, // keep previous page's rows visible while the next loads
  })

  return {
    users: listQuery.data?.items ?? [],
    total: listQuery.data?.total ?? 0,
    page,
    pageSize,
    setPage,
    loading: listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
  }
}
