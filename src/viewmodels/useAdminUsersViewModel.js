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
 */
import { useQuery } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { queryKeys } from '../query/queryKeys.js'

const ROLES = ['ADMIN', 'CUSTOMER', 'SELLER', 'DELIVERY']
const PAGE_SIZE = 100
const MAX_PAGES = 50 // safety cap (5,000 users/role) in case pagination params are ignored

function extractUsers(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.users)) return raw.users
  if (Array.isArray(raw?.results)) return raw.results
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function extractTotalCount(raw) {
  const candidate = raw?.count ?? raw?.total ?? raw?.total_count
  return typeof candidate === 'number' ? candidate : null
}

function idKeyOf(u) {
  const id = u?.id ?? u?.user_id
  return id != null ? String(id) : null
}

function dedupeInto(users, seenIds, batch) {
  let newCount = 0
  for (const u of batch) {
    const key = idKeyOf(u)
    if (key != null) {
      if (seenIds.has(key)) continue
      seenIds.add(key)
    }
    users.push(u)
    newCount += 1
  }
  return newCount
}

/**
 * Candidate query-param conventions for page N (1-indexed), tried in order.
 * `page` + `limit` is tried first because it's the confirmed-working convention
 * for this backend's other paginated admin lists (see productService.getPublicProducts,
 * which the products table pagination goes through).
 */
const PAGE_PARAM_STRATEGIES = [
  (p) => ({ page: p, limit: PAGE_SIZE }),
  (p) => ({ page: p, page_size: PAGE_SIZE }),
  (p) => ({ offset: (p - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
]

/**
 * Tries every candidate page-param convention against `fetchPage(2, params)`, adopts
 * the first one that returns rows beyond page 1, and walks the rest of the pages with
 * it. Returns null if no convention works (caller decides the fallback).
 */
async function paginateWith(fetchPage, users, seenIds, totalCount) {
  let workingStrategy = null
  for (const strategy of PAGE_PARAM_STRATEGIES) {
    const raw = await fetchPage(strategy(2))
    const batch = extractUsers(raw)
    const before = users.length
    const newCount = dedupeInto(users, seenIds, batch)
    if (newCount > 0) {
      workingStrategy = strategy
      if (totalCount == null) totalCount = extractTotalCount(raw)
      if (batch.length < PAGE_SIZE || (totalCount != null && users.length >= totalCount)) {
        return { totalCount, worked: true } // page 2 was already the last page
      }
      break
    }
    users.length = before // strategy didn't help — undo and try the next one
  }

  if (!workingStrategy) return { totalCount, worked: false } // no convention worked for this endpoint

  for (let page = 3; page <= MAX_PAGES; page += 1) {
    const raw = await fetchPage(workingStrategy(page))
    const batch = extractUsers(raw)
    const newCount = dedupeInto(users, seenIds, batch)
    if (batch.length === 0 || newCount === 0) break
    if (totalCount != null && users.length >= totalCount) break
    if (batch.length < PAGE_SIZE) break
  }

  return { totalCount, worked: true }
}

/**
 * Fetches every page for one role. The backend's default page size caps a single
 * response at ~100 rows, so a plain single-request fetch silently truncates large
 * roles (e.g. CUSTOMER). The exact pagination query-param convention this backend
 * honors isn't confirmed, so this tries each candidate against the role-specific
 * endpoint (GET /api/accounts/admin/users/role/{role}); if that endpoint doesn't
 * paginate at all, it retries the same probing against the generic
 * GET /api/accounts/admin/users?role={role} endpoint (already known to support a
 * `role` filter — see listSellers's fallback). If neither works, whatever the first
 * page returned is all we can get.
 */
async function fetchAllUsersForRole(role, signal) {
  const seenIds = new Set()
  const users = []

  const page1Raw = await adminService.listAdminUsersByRole(role, { signal })
  const page1Batch = extractUsers(page1Raw)
  let totalCount = extractTotalCount(page1Raw)
  dedupeInto(users, seenIds, page1Batch)

  if (page1Batch.length < PAGE_SIZE) return users // fewer than a full page — that's everything
  if (totalCount != null && users.length >= totalCount) return users

  const roleResult = await paginateWith(
    (params) => adminService.listAdminUsersByRole(role, { signal, params }),
    users,
    seenIds,
    totalCount,
  )
  totalCount = roleResult.totalCount
  if (totalCount != null && users.length >= totalCount) return users
  if (roleResult.worked) return users // role endpoint's own pagination worked

  // Role endpoint doesn't paginate — retry via the generic endpoint's `role` filter.
  await paginateWith(
    (params) => adminService.listAdminUsers({ signal, params: { role, ...params } }),
    users,
    seenIds,
    totalCount,
  )

  return users
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
            const users = await fetchAllUsersForRole(role, signal)
            return users.map((u) => ({ ...u, role: u?.role || role }))
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
