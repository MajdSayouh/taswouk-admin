/**
 * Mall product assignments — scoped by mall id.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as mallService from '../services/mallService.js'
import * as mallCatalogService from '../services/mallCatalogService.js'
import { mapMallProductAssignmentFromApi } from '../models/MallProductAssignment.js'
import { queryKeys } from '../query/queryKeys.js'
import { fetchAllPages } from '../utils/fetchAllPages.js'

/**
 * @param {number | string | undefined} mallId
 * @param {{ enabled?: boolean }} [options]
 */
export function useMallProductsViewModel(mallId, options = {}) {
  const enabled = options.enabled !== false && mallId != null && mallId !== ''
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.malls.products(mallId),
    queryFn: async ({ signal }) => {
      // A single request caps at the backend's default page size, which was silently
      // truncating malls with more assigned products than that — page through all of them.
      const rows = await fetchAllPages(
        async (params) => {
          const { products, total } = await mallService.listMallProducts(mallId, { signal, params })
          return { items: Array.isArray(products) ? products : [], total }
        },
        (row) => (row?.id != null ? String(row.id) : null),
      )
      return rows.map(mapMallProductAssignmentFromApi)
    },
    enabled,
  })

  const assignMutation = useMutation({
    mutationFn: (payload) => mallService.assignProductToMall(mallId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.products(mallId) })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }) =>
      mallService.updateMallProduct(mallId, productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.products(mallId) })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (productId) => mallService.removeProductFromMall(mallId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.products(mallId) })
    },
  })

  // Product name isn't part of the mall assignment (only price/availability are mall-scoped) —
  // it lives on the shared catalog product, so renaming here updates it everywhere that product
  // is assigned. Invalidate both this mall's list and the catalog so everything stays in sync.
  const renameMutation = useMutation({
    mutationFn: ({ productId, name }) =>
      mallCatalogService.updateMallCatalogProduct(productId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.products(mallId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.mallCatalog.all() })
    },
  })

  return {
    assignments: listQuery.data ?? [],
    loading: enabled && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    assignMutation,
    updateMutation,
    removeMutation,
    renameMutation,
  }
}
