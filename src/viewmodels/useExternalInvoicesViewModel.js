import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys.js'
import {
  createExternalInvoice,
  getExternalInvoice,
  getPendingExternalInvoices,
} from '../services/externalInvoiceService.js'

/** Delivered external orders still waiting for a price — polled so the alert stays current. */
export function usePendingExternalInvoices(options = {}) {
  return useQuery({
    queryKey: queryKeys.externalInvoices.pending(),
    queryFn: ({ signal }) => getPendingExternalInvoices({ signal, limit: 200 }),
    enabled: options.enabled !== false,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

export function usePendingExternalInvoicesCount(options = {}) {
  const query = usePendingExternalInvoices(options)
  return query.data?.count ?? 0
}

/** @param {number | string | null | undefined} orderId */
export function useExternalInvoice(orderId, options = {}) {
  return useQuery({
    queryKey: queryKeys.externalInvoices.detail(orderId),
    queryFn: ({ signal }) => getExternalInvoice(orderId, { signal }),
    enabled: options.enabled !== false && orderId != null,
  })
}

export function useCreateExternalInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, ...payload }) => createExternalInvoice(orderId, payload),
    onSettled: () => {
      // A 409 means someone else priced it meanwhile — refresh either way.
      queryClient.invalidateQueries({ queryKey: queryKeys.externalInvoices.root })
    },
  })
}
