/**
 * Central TanStack Query keys — use with `queryClient.invalidateQueries`.
 * Keep list/detail keys predictable so mutations can refresh related lists.
 */

export const queryKeys = {
  stores: {
    all: () => ['stores'],
    detail: (id) => ['stores', 'detail', String(id)],
  },
  products: {
    root: ['products'],
    list: (params) => ['products', 'list', params ?? {}],
    detail: (id) => ['products', 'detail', String(id)],
    variants: (productId) => ['products', 'variants', String(productId)],
  },
  orders: {
    all: () => ['orders'],
    detail: (id, orderType) => ['orders', 'detail', String(id ?? ''), String(orderType ?? '')],
  },
  categories: {
    all: () => ['categories'],
    subcategories: () => ['categories', 'subcategories'],
    combined: () => ['categories', 'combined'],
  },
  auth: {
    profile: () => ['auth', 'profile'],
  },
  sellers: {
    all: () => ['sellers'],
    detail: (id) => ['sellers', 'detail', String(id)],
  },
  coupons: {
    all: () => ['coupons'],
  },
  progressiveCoupons: {
    all: () => ['progressiveCoupons'],
    stats: (id) => ['progressiveCoupons', 'stats', String(id)],
  },
  banners: {
    all: () => ['banners'],
    placements: () => ['banners', 'placements'],
  },
  pointsSettings: {
    all: () => ['pointsSettings'],
  },
  exchangeRateSettings: {
    all: () => ['exchangeRateSettings'],
  },
  adminUsers: {
    all: () => ['adminUsers'],
    // `page`/`pageSize` are optional so existing callers that just want "all of this
    // role" (dropdowns) keep their original cache key; paginated table views pass them.
    byRole: (role, page, pageSize) =>
      page == null
        ? ['adminUsers', 'role', String(role)]
        : ['adminUsers', 'role', String(role), 'page', page, pageSize],
  },
  drivers: {
    all: () => ['drivers'],
  },
  notifications: {
    all: () => ['notifications', 'log'],
    unreadCount: () => ['notifications', 'unread-count'],
  },
  malls: {
    all: () => ['malls'],
    detail: (id) => ['malls', 'detail', String(id)],
    products: (mallId, params) => ['malls', 'products', String(mallId), params ?? {}],
  },
  mallCatalog: {
    all: () => ['mallCatalog'],
    detail: (id) => ['mallCatalog', 'detail', String(id)],
  },
  mallCategories: {
    all: () => ['mallCategories'],
  },
  externalShops: {
    all: () => ['externalShops'],
    detail: (id) => ['externalShops', 'detail', String(id)],
  },
}
