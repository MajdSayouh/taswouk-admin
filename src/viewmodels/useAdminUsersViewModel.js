/**
 * Admin users ViewModel — list all users (group by role in the view).
 *
 * The generic `GET /api/accounts/admin/users` endpoint does not reliably return
 * sellers/drivers on this backend (confirmed: the Drivers tab, which hits the
 * role-specific `GET /api/accounts/admin/users/role/{role}` endpoint, shows rows
 * that never appear here). So instead of one generic call, we fetch each role
 * from the role-specific endpoint in parallel and merge the results. Each row is
 * explicitly tagged with the role it was fetched under, so grouping in the view
 * never depends on a `role` field the backend may omit or spell differently.
 *
 * This hook fetches a single page per role and is used only by the legacy
 * all-roles accordion view. The per-role tabs (Users > Customers/Sellers/
 * Delivery/Admins) use `useUsersByRoleViewModel` instead, which pages through
 * the backend's paginated response so large roles (500+ customers) aren't
 * truncated at one page.
 */
import { useQuery } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { queryKeys } from '../query/queryKeys.js'

const ROLES = ['ADMIN', 'CUSTOMER', 'SELLER', 'DELIVERY']

function extractUsers(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.users)) return raw.users
  if (Array.isArray(raw?.results)) return raw.results
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

/**
 * @param {{ fetchOnMount?: boolean }} [options]
 */
export function useAdminUsersViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false

  const listQuery = useQuery({
    queryKey: queryKeys.adminUsers.all(),
    queryFn: async ({ signal }) => {
      const perRole = await Promise.all(
        ROLES.map(async (role) => {
          try {
            const raw = await adminService.listAdminUsersByRole(role, { signal })
            return extractUsers(raw).map((u) => ({ ...u, role: u?.role || role }))
          } catch (err) {
            // One role failing (e.g. not implemented for that role) shouldn't blank the whole page.
            if (err?.status === 404) return []
            throw err
          }
        }),
      )
      return perRole.flat()
    },
    enabled: fetchOnMount,
  })

  const users = listQuery.data ?? []
  const count = users.length

  return {
    users,
    count,
    loading: fetchOnMount && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    isFetched: listQuery.isFetched,
  }
}
