/**
 * Mall product assignments — scoped by mall id, server-paginated + searched.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as mallService from '../services/mallService.js'
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

  const createMutation = useMutation({
    mutationFn: (payload) => mallService.createMallProduct(mallId, payload),
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

  // Renaming now goes through the mall's own product, like every other edit.
  // It used to call the catalogue service, because the name lived on a row
  // shared between malls — so renaming a product here renamed it for every
  // mall that stocked it. There is no shared row left, so the special case
  // and its extra cache invalidation go with it.
  const renameMutation = useMutation({
    mutationFn: ({ productId, name }) =>
      mallService.updateMallProduct(mallId, productId, { name }),
    onSuccess: invalidate,
  })

  const uploadImagesMutation = useMutation({
    mutationFn: ({ productId, files, featuredIndex }) =>
      mallService.uploadMallProductImages(mallId, productId, files, { featuredIndex }),
    onSuccess: invalidate,
  })

  const setFeaturedImageMutation = useMutation({
    mutationFn: ({ productId, imageId }) =>
      mallService.setFeaturedMallProductImage(mallId, productId, imageId),
    onSuccess: invalidate,
  })

  const deleteImageMutation = useMutation({
    mutationFn: ({ productId, imageId }) =>
      mallService.deleteMallProductImage(mallId, productId, imageId),
    onSuccess: invalidate,
  })

  return {
    assignments: listQuery.data?.rows ?? [],
    total: listQuery.data?.total ?? 0,
    loading: enabled && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    createMutation,
    updateMutation,
    removeMutation,
    renameMutation,
    uploadImagesMutation,
    setFeaturedImageMutation,
    deleteImageMutation,
  }
}
