/**
 * Stores ViewModel — list + mutations for active / brand flags.
 */
import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as storeService from '../services/storeService.js'
import { mapStoreFromApi } from '../models/Store.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateStoreQueries(queryClient, storeId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.stores.all() })
  if (storeId != null && storeId !== '') {
    queryClient.invalidateQueries({ queryKey: queryKeys.stores.detail(storeId) })
  }
}

export function useStoresViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: async ({ signal }) => {
      const list = await storeService.listStores({ signal })
      return Array.isArray(list) ? list.map(mapStoreFromApi) : []
    },
    enabled: fetchOnMount,
  })

  const setStoreActiveMutation = useMutation({
    mutationFn: async ({ storeId, isActive }) => {
      await storeService.toggleStoreActive(storeId, isActive)
    },
    onSuccess: (_, { storeId }) => invalidateStoreQueries(queryClient, storeId),
  })

  const setStoreBrandMutation = useMutation({
    mutationFn: async ({ storeId, isBrand }) => {
      await storeService.setStoreBrand(storeId, isBrand)
    },
    onSuccess: (_, { storeId }) => invalidateStoreQueries(queryClient, storeId),
  })

  const deleteMutation = useMutation({
    mutationFn: (storeId) => storeService.deleteStore(storeId),
    onSuccess: (_, storeId) => invalidateStoreQueries(queryClient, storeId),
  })

  const deleteStore = useCallback(
    async (storeId) => {
      await deleteMutation.mutateAsync(storeId)
    },
    [deleteMutation],
  )

  return {
    stores: query.data ?? [],
    loading: fetchOnMount && query.isFetching,
    error: query.error?.message ?? null,
    fetchStores: query.refetch,
    deleteStore,
    deleteMutation,
    setStoreActiveMutation,
    setStoreBrandMutation,
  }
}
