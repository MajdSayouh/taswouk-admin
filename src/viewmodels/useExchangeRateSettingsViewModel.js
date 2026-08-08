import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { queryKeys } from '../query/queryKeys.js'

export function useExchangeRateSettingsViewModel() {
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (payload) => adminService.updateExchangeRateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exchangeRateSettings.all() })
    },
  })

  return {
    updateMutation,
  }
}
