/**
 * Malls (admin) — list, create, update, delete, toggle active.
 */
import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as mallService from '../services/mallService.js'
import { mapMallFromApi } from '../models/Mall.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateMallQueries(queryClient, mallId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.malls.all() })
  if (mallId != null && mallId !== '') {
    queryClient.invalidateQueries({ queryKey: queryKeys.malls.detail(mallId) })
  }
}

export function useMallsViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.malls.all(),
    queryFn: async ({ signal }) => {
      const { malls } = await mallService.listMalls({ signal })
      return (Array.isArray(malls) ? malls : []).map(mapMallFromApi)
    },
    enabled: fetchOnMount,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => mallService.createMall(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.all() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ mallId, payload }) => mallService.updateMall(mallId, payload),
    onSuccess: (_, { mallId }) => invalidateMallQueries(queryClient, mallId),
  })

  const deleteMutation = useMutation({
    mutationFn: (mallId) => mallService.deleteMall(mallId),
    onSuccess: (_, mallId) => invalidateMallQueries(queryClient, mallId),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (mallId) => mallService.toggleMallActive(mallId),
    onSuccess: (_, mallId) => invalidateMallQueries(queryClient, mallId),
  })

  const createMall = useCallback(
    async (payload) => {
      const data = await createMutation.mutateAsync(payload)
      return mapMallFromApi(data)
    },
    [createMutation],
  )

  const updateMall = useCallback(
    async (mallId, payload) => {
      const data = await updateMutation.mutateAsync({ mallId, payload })
      return mapMallFromApi(data)
    },
    [updateMutation],
  )

  const deleteMall = useCallback(
    async (mallId) => {
      await deleteMutation.mutateAsync(mallId)
    },
    [deleteMutation],
  )

  const saving = createMutation.isPending || updateMutation.isPending
  const error =
    listQuery.error?.message ??
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    null

  return {
    malls: listQuery.data ?? [],
    loading: fetchOnMount && listQuery.isFetching,
    error,
    refetch: listQuery.refetch,
    createMall,
    updateMall,
    deleteMall,
    saving,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleActiveMutation,
  }
}
