/**
 * Banners ViewModel — list + CRUD + replace image.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as bannerService from '../services/bannerService.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateBanners(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.banners.all() })
}

/**
 * @param {{ fetchOnMount?: boolean }} [options]
 */
export function useBannersViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.banners.all(),
    queryFn: ({ signal }) => bannerService.listBanners({ signal }),
    enabled: fetchOnMount,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  // Placements barely ever change — cache them for the session instead of refetching per mount.
  const placementsQuery = useQuery({
    queryKey: queryKeys.banners.placements(),
    queryFn: ({ signal }) => bannerService.getBannerPlacements({ signal }),
    enabled: fetchOnMount,
    staleTime: 10 * 60_000,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => bannerService.createBanner(payload),
    onSuccess: () => invalidateBanners(queryClient),
  })

  const updateMutation = useMutation({
    mutationFn: ({ bannerId, payload }) => bannerService.updateBanner(bannerId, payload),
    onSuccess: () => invalidateBanners(queryClient),
  })

  const deleteMutation = useMutation({
    mutationFn: (bannerId) => bannerService.deleteBanner(bannerId),
    onSuccess: () => invalidateBanners(queryClient),
  })

  const replaceImageMutation = useMutation({
    mutationFn: ({ bannerId, file }) => bannerService.replaceBannerImage(bannerId, file),
    onSuccess: () => invalidateBanners(queryClient),
  })

  return {
    banners: listQuery.data ?? [],
    loading: fetchOnMount && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    isFetched: listQuery.isFetched,
    placements: placementsQuery.data ?? [],
    placementsLoading: fetchOnMount && placementsQuery.isFetching,
    createMutation,
    updateMutation,
    deleteMutation,
    replaceImageMutation,
  }
}
