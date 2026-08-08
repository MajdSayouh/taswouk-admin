import * as adminService from '../../services/adminService.js'

/**
 * Users suitable as notification recipients (customers). Tries role endpoint first.
 * @returns {Promise<Array<{ id: number; label: string; searchText: string }>>}
 */
export async function fetchCustomerUserOptions() {
  /** @type {unknown[]} */
  let rows = []
  try {
    const data = await adminService.listAdminUsersByRole('CUSTOMER')
    if (Array.isArray(data?.users)) rows = data.users
    else if (Array.isArray(data)) rows = data
    else if (Array.isArray(data?.results)) rows = data.results
    else rows = []
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
