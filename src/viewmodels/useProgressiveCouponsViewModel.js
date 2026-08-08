/**
 * Progressive Coupons ViewModel — list + create + toggle active + per-coupon stats.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as progressiveCouponService from '../services/progressiveCouponService.js'
import {
  mapProgressiveCouponFromApi,
  mapProgressiveCouponStatsFromApi,
} from '../models/ProgressiveCoupon.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateProgressiveCoupons(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.progressiveCoupons.all() })
}

/**
 * @param {{ fetchOnMount?: boolean }} [options]
 */
export function useProgressiveCouponsViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.progressiveCoupons.all(),
    queryFn: async ({ signal }) => {
      const list = await progressiveCouponService.listProgressiveCoupons({ signal })
      return Array.isArray(list) ? list.map(mapProgressiveCouponFromApi) : []
    },
    enabled: fetchOnMount,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => progressiveCouponService.createProgressiveCoupon(payload),
    onSuccess: () => invalidateProgressiveCoupons(queryClient),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ couponId, payload }) =>
      progressiveCouponService.updateProgressiveCoupon(couponId, payload),
    onSuccess: () => invalidateProgressiveCoupons(queryClient),
  })

  return {
    progressiveCoupons: listQuery.data ?? [],
    loading: fetchOnMount && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    isFetched: listQuery.isFetched,
    createMutation,
    updateStatusMutation,
  }
}

/**
 * @param {number | string | null} couponId
 * @param {{ enabled?: boolean }} [options]
 */
export function useProgressiveCouponStats(couponId, options = {}) {
  const enabled = Boolean(options.enabled) && couponId != null && couponId !== ''
  return useQuery({
    queryKey: queryKeys.progressiveCoupons.stats(couponId),
    queryFn: async () => {
      const list = await progressiveCouponService.getProgressiveCouponStats(couponId)
      return Array.isArray(list) ? list.map(mapProgressiveCouponStatsFromApi) : []
    },
    enabled,
  })
}
