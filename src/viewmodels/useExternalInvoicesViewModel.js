import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query/queryKeys.js'
import {
  createPurchaseBatch,
  getExternalInvoice,
  getPendingExternalInvoices,
  getPurchaseBatches,
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

export function usePurchaseBatches() {
  return useQuery({
    queryKey: queryKeys.externalInvoices.batches(),
    queryFn: ({ signal }) => getPurchaseBatches({ signal, limit: 200 }),
  })
}

export function useCreatePurchaseBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPurchaseBatch,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.externalInvoices.root })
    },
  })
}
