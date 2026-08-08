/**
 * Mall product assignments — scoped by mall id.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as mallService from '../services/mallService.js'
import { mapMallProductAssignmentFromApi } from '../models/MallProductAssignment.js'
import { queryKeys } from '../query/queryKeys.js'

/**
 * @param {number | string | undefined} mallId
 * @param {{ enabled?: boolean }} [options]
 */
export function useMallProductsViewModel(mallId, options = {}) {
  const enabled = options.enabled !== false && mallId != null && mallId !== ''
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.malls.products(mallId),
    queryFn: async () => {
      const { products } = await mallService.listMallProducts(mallId)
      return (Array.isArray(products) ? products : []).map(mapMallProductAssignmentFromApi)
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

  return {
    assignments: listQuery.data ?? [],
    loading: enabled && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    assignMutation,
    updateMutation,
    removeMutation,
  }
}
