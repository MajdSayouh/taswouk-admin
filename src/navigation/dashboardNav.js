import { isAdminRole } from '../store/authStore.js'

const BASE_NAV = [
  { label: 'Dashboard', to: '/admin/dashboard', match: 'exact' },
  { label: 'Orders', to: '/admin/orders', match: 'exact' },
  { label: 'Products', to: '/admin/products', match: 'prefix' },
  { label: 'Customers', to: '/admin/customers', match: 'exact' },
  { label: 'Categories', to: '/admin/categories', match: 'prefix' },
  { label: 'Brands', to: '/admin/brands', match: 'exact' },
  { label: 'Vendors', to: '/admin/vendors', match: 'exact' },
  { label: 'Stores', to: '/admin/stores', match: 'prefix' },
  { label: 'Blog', to: '/admin/blog', match: 'exact' },
  { label: 'Marketing', to: '/admin/marketing', match: 'exact' },
  { label: 'Analytics', to: '/admin/analytics', match: 'exact' },
  { label: 'Profile', to: '/admin/profile', match: 'exact' },
  { label: 'Settings', to: '/admin/settings', match: 'exact' },
]

/**
 * @param {{ role?: string } | null | undefined} user
 * @returns {Array<{ label: string, to: string, match: 'exact' | 'prefix' }>}
 */
export function getDashboardNavItems(user) {
  if (user && isAdminRole(user.role)) {
    return [
      ...BASE_NAV.slice(0, 8),
      { label: 'Sellers', to: '/admin/sellers', match: 'prefix' },
      ...BASE_NAV.slice(8),
    ]
  }
  return BASE_NAV
}

/**
 * @param {string} pathname
 * @param {string} to
 * @param {'exact' | 'prefix'} match
 */
export function isNavActive(pathname, to, match) {
  if (match === 'prefix') {
    return pathname === to || pathname.startsWith(`${to}/`)
  }
  return pathname === to
}
