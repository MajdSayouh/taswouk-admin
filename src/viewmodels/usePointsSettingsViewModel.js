/**
 * Admin points settings ViewModel — GET/PUT points_per_amount.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { queryKeys } from '../query/queryKeys.js'

/**
 * @param {{ fetchOnMount?: boolean }} [options]
 */
export function usePointsSettingsViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: queryKeys.pointsSettings.all(),
    queryFn: ({ signal }) => adminService.getPointsSettings({ signal }),
    enabled: fetchOnMount,
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => adminService.updatePointsSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pointsSettings.all() })
    },
  })

  return {
    settings: settingsQuery.data ?? null,
    loading: fetchOnMount && settingsQuery.isFetching,
    error: settingsQuery.error?.message ?? null,
    refetch: settingsQuery.refetch,
    updateMutation,
  }
}
