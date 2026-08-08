/**
 * Coupons ViewModel — list + CRUD + validate.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as couponService from '../services/couponService.js'
import { mapCouponFromApi } from '../models/Coupon.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateCoupons(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all() })
}

/**
 * @param {{ fetchOnMount?: boolean }} [options]
 */
export function useCouponsViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.coupons.all(),
    queryFn: async ({ signal }) => {
      const list = await couponService.listCoupons({ signal })
      return Array.isArray(list) ? list.map(mapCouponFromApi) : []
    },
    enabled: fetchOnMount,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => couponService.createCoupon(payload),
    onSuccess: () => invalidateCoupons(queryClient),
  })

  const updateMutation = useMutation({
    mutationFn: ({ couponId, payload }) => couponService.updateCoupon(couponId, payload),
    onSuccess: () => invalidateCoupons(queryClient),
  })

  const deleteMutation = useMutation({
    mutationFn: (couponId) => couponService.deleteCoupon(couponId),
    onSuccess: () => invalidateCoupons(queryClient),
  })

  const validateMutation = useMutation({
    mutationFn: (payload) => couponService.validateCoupon(payload),
  })

  return {
    coupons: listQuery.data ?? [],
    loading: fetchOnMount && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    isFetched: listQuery.isFetched,
    createMutation,
    updateMutation,
    deleteMutation,
    validateMutation,
  }
}
