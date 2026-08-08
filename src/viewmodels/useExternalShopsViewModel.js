/**
 * External shops (admin) — list, create, update, delete.
 */
import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as externalShopService from '../services/externalShopService.js'
import { mapExternalShopFromApi } from '../models/ExternalShop.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateExternalShopQueries(queryClient, shopId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.externalShops.all() })
  if (shopId != null && shopId !== '') {
    queryClient.invalidateQueries({ queryKey: queryKeys.externalShops.detail(shopId) })
  }
}

export function useExternalShopsViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.externalShops.all(),
    queryFn: async ({ signal }) => {
      const rows = await externalShopService.listExternalShops({ signal })
      return (Array.isArray(rows) ? rows : []).map(mapExternalShopFromApi)
    },
    enabled: fetchOnMount,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => externalShopService.createExternalShop(payload),
    onSuccess: () => invalidateExternalShopQueries(queryClient),
  })

  const updateMutation = useMutation({
    mutationFn: ({ shopId, payload }) => externalShopService.updateExternalShop(shopId, payload),
    onSuccess: (_, { shopId }) => invalidateExternalShopQueries(queryClient, shopId),
  })

  const deleteMutation = useMutation({
    mutationFn: (shopId) => externalShopService.deleteExternalShop(shopId),
    onSuccess: (_, shopId) => invalidateExternalShopQueries(queryClient, shopId),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: ({ shopId, file }) => externalShopService.uploadExternalShopLogo(shopId, file),
    onSuccess: (_, { shopId }) => invalidateExternalShopQueries(queryClient, shopId),
  })

  const shops = listQuery.data ?? []
  const loading = fetchOnMount && listQuery.isFetching

  const error =
    listQuery.error?.message ??
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    uploadLogoMutation.error?.message ??
    null

  const createShop = useCallback(
    (payload) => createMutation.mutateAsync(payload),
    [createMutation],
  )
  const updateShop = useCallback(
    (shopId, payload) => updateMutation.mutateAsync({ shopId, payload }),
    [updateMutation],
  )
  const deleteShop = useCallback(
    (shopId) => deleteMutation.mutateAsync(shopId),
    [deleteMutation],
  )

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    uploadLogoMutation.isPending

  return {
    shops,
    loading,
    saving,
    error,
    refetch: listQuery.refetch,
    createShop,
    updateShop,
    deleteShop,
    createMutation,
    updateMutation,
    deleteMutation,
    uploadLogoMutation,
  }
}
