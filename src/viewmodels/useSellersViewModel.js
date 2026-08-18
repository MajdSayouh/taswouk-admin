/**
 * Sellers (admin) — list, create, update, delete via admin accounts API.
 */
import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { mapSellerFromApi } from '../models/Seller.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateSellerQueries(queryClient, sellerId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all() })
  if (sellerId != null && sellerId !== '') {
    queryClient.invalidateQueries({ queryKey: queryKeys.sellers.detail(sellerId) })
  }
}

export function useSellersViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.sellers.all(),
    queryFn: async ({ signal }) => {
      const list = await adminService.listSellers({ signal })
      return Array.isArray(list) ? list.map(mapSellerFromApi) : []
    },
    enabled: fetchOnMount,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => adminService.createSeller(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ sellerId, payload }) => adminService.updateSeller(sellerId, payload),
    onSuccess: (_, { sellerId }) => invalidateSellerQueries(queryClient, sellerId),
  })

  const deleteMutation = useMutation({
    mutationFn: (sellerId) => adminService.deleteSeller(sellerId),
    onSuccess: (_, sellerId) => invalidateSellerQueries(queryClient, sellerId),
  })

  const setPasswordMutation = useMutation({
    mutationFn: ({ sellerId, newPassword }) =>
      adminService.setSellerPassword(sellerId, newPassword),
  })

  const createSeller = useCallback(
    async (payload) => {
      const data = await createMutation.mutateAsync(payload)
      return mapSellerFromApi(data)
    },
    [createMutation],
  )

  const updateSeller = useCallback(
    async (sellerId, payload) => {
      const data = await updateMutation.mutateAsync({ sellerId, payload })
      return mapSellerFromApi(data)
    },
    [updateMutation],
  )

  const deleteSeller = useCallback(
    async (sellerId) => {
      await deleteMutation.mutateAsync(sellerId)
    },
    [deleteMutation],
  )

  const setSellerPassword = useCallback(
    (sellerId, newPassword) => setPasswordMutation.mutateAsync({ sellerId, newPassword }),
    [setPasswordMutation],
  )

  const saving = createMutation.isPending || updateMutation.isPending
  const error =
    listQuery.error?.message ??
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    null

  return {
    sellers: listQuery.data ?? [],
    updateSellerMutation: updateMutation,
    loading: fetchOnMount && listQuery.isFetching,
    error,
    refetch: listQuery.refetch,
    createSeller,
    updateSeller,
    deleteSeller,
    setSellerPassword,
    settingPassword: setPasswordMutation.isPending,
    saving,
  }
}
