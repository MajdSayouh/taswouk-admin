import * as adminService from '../../services/adminService.js'
import { fetchAllPages } from '../../utils/fetchAllPages.js'

function usersFromResponse(data) {
  if (Array.isArray(data?.users)) return data.users
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

/**
 * Users suitable as notification recipients (customers). Tries role endpoint first.
 * @returns {Promise<Array<{ id: number; label: string; searchText: string }>>}
 */
export async function fetchCustomerUserOptions() {
  /** @type {unknown[]} */
  let rows = []
  try {
    // A single request caps at the backend's default page size (100) — this was silently
    // truncating the recipient list on stores with more than 100 customers. Page through all.
    rows = await fetchAllPages(
      async (params) => {
        const data = await adminService.listAdminUsersByRole('CUSTOMER', { params })
        return { items: usersFromResponse(data), total: data?.count ?? null }
      },
      (row) => (row?.id != null ? String(row.id) : null),
    )
  } catch {
    const data = await adminService.listAdminUsers()
    const users = Array.isArray(data?.users) ? data.users : []
    rows = users.filter((u) => String(u?.role || '').toUpperCase() === 'CUSTOMER')
  }

  return rows
    .map((u) => {
      const id = Number(u?.id)
      if (!Number.isInteger(id) || id <= 0) return null
      const first = typeof u?.first_name === 'string' ? u.first_name.trim() : ''
      const last = typeof u?.last_name === 'string' ? u.last_name.trim() : ''
      const name = [first, last].filter(Boolean).join(' ') || '—'
      const email = typeof u?.email === 'string' ? u.email : ''
      const phone = typeof u?.phone === 'string' ? u.phone : ''
      const label = `${name} (#${id})`
      const searchText = [name, email, phone, String(id)].filter(Boolean).join(' ').toLowerCase()
      return { id, label, searchText, email, phone }
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label))
}
