import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys.js'
import {
  addOrdersToRun,
  closeDeliveryRun,
  createDeliveryRun,
  decideRunOrder,
  dispatchDeliveryRun,
  getDeliveryRun,
  getDeliveryRunCandidates,
  listDeliveryRuns,
  removeOrderFromRun,
  setOrderInternalStage,
} from '../services/deliveryRunService.js'

/** @param {string} day — YYYY-MM-DD */
export function useDeliveryRuns(day) {
  return useQuery({
    queryKey: queryKeys.deliveryRuns.list(day),
    queryFn: ({ signal }) => listDeliveryRuns({ day, signal }),
    enabled: Boolean(day),
  })
}

export function useDeliveryRun(runId) {
  return useQuery({
    queryKey: queryKeys.deliveryRuns.detail(runId),
    queryFn: ({ signal }) => getDeliveryRun(runId, { signal }),
    enabled: runId != null,
  })
}

export function useDeliveryRunCandidates() {
  return useQuery({
    queryKey: queryKeys.deliveryRuns.candidates(),
    queryFn: ({ signal }) => getDeliveryRunCandidates({ signal }),
    refetchInterval: 120_000,
  })
}

/** Every change touches runs, candidates and the orders list alike. */
function useRunMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveryRuns.root })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
    },
  })
}

export const useCreateDeliveryRun = () => useRunMutation(createDeliveryRun)
export const useAddOrdersToRun = () => useRunMutation(addOrdersToRun)
export const useRemoveOrderFromRun = () => useRunMutation(removeOrderFromRun)
export const useDispatchDeliveryRun = () => useRunMutation(dispatchDeliveryRun)
export const useDecideRunOrder = () => useRunMutation(decideRunOrder)
export const useCloseDeliveryRun = () => useRunMutation(closeDeliveryRun)
export const useSetOrderInternalStage = () => useRunMutation(setOrderInternalStage)
