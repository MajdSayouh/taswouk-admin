/**
 * Mall product assignments — scoped by mall id, server-paginated + searched.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as mallService from '../services/mallService.js'
import * as mallCatalogService from '../services/mallCatalogService.js'
import { mapMallProductAssignmentFromApi } from '../models/MallProductAssignment.js'
import { queryKeys } from '../query/queryKeys.js'

/**
 * @param {number | string | undefined} mallId
 * @param {{ enabled?: boolean, page?: number, pageSize?: number, search?: string }} [options]
 */
export function useMallProductsViewModel(mallId, options = {}) {
  const { page = 1, pageSize = 10, search = '' } = options
  const enabled = options.enabled !== false && mallId != null && mallId !== ''
  const queryClient = useQueryClient()
  const trimmedSearch = search.trim()

  const listQuery = useQuery({
    queryKey: queryKeys.malls.products(mallId, { page, pageSize, search: trimmedSearch }),
    queryFn: async ({ signal }) => {
      // A search term routes to the public search endpoint (real `q` + `moll_id` filtering
      // server-side) instead of paging through every assignment to filter client-side.
      const { products, total } = trimmedSearch
        ? await mallService.searchMallProducts(mallId, { q: trimmedSearch, page, limit: pageSize, signal })
        : await mallService.listMallProducts(mallId, { page, pageSize, signal })
      return { rows: products.map(mapMallProductAssignmentFromApi), total }
    },
    enabled,
    placeholderData: (prev) => prev,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.malls.products(mallId) })
  }

  const assignMutation = useMutation({
    mutationFn: (payload) => mallService.assignProductToMall(mallId, payload),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }) =>
      mallService.updateMallProduct(mallId, productId, payload),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: (productId) => mallService.removeProductFromMall(mallId, productId),
    onSuccess: invalidate,
  })

  // Product name isn't part of the mall assignment (only price/availability are mall-scoped) —
  // it lives on the shared catalog product, so renaming here updates it everywhere that product
  // is assigned. Invalidate both this mall's list and the catalog so everything stays in sync.
  const renameMutation = useMutation({
    mutationFn: ({ productId, name }) =>
      mallCatalogService.updateMallCatalogProduct(productId, { name }),
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: queryKeys.mallCatalog.all() })
    },
  })

  return {
    assignments: listQuery.data?.rows ?? [],
    total: listQuery.data?.total ?? 0,
    loading: enabled && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    assignMutation,
    updateMutation,
    removeMutation,
    renameMutation,
  }
}
