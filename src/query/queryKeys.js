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
  },
  orders: {
    all: () => ['orders'],
  },
  categories: {
    all: () => ['categories'],
    subcategories: () => ['categories', 'subcategories'],
    combined: () => ['categories', 'combined'],
  },
  auth: {
    profile: () => ['auth', 'profile'],
  },
}
