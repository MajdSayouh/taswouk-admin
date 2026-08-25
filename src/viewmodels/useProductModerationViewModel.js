/**
 * Product Moderation ViewModel — the review queue, single approve/reject, and bulk
 * approve/reject, via `productModerationService` (TanStack Query).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as productModerationService from '../services/productModerationService.js'
import * as productService from '../services/productService.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateModerationQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.moderationQueue.root })
  // The product itself changed (status, or a pending edit got applied/discarded) — the regular
  // products screens need to reflect that too. See product-moderation-dashboard-spec.md §4.2.
  queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
}

/** Approve/reject (single + bulk) mutations — shared by the queue and review screens so the
 * review screen doesn't need to mount a queue list query just to approve/reject one product. */
export function useModerationDecisionMutations() {
  const queryClient = useQueryClient()

  const approveMutation = useMutation({
    mutationFn: (productId) => productModerationService.approveModerationProduct(productId),
    onSuccess: () => invalidateModerationQueries(queryClient),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ productId, reason }) =>
      productModerationService.rejectModerationProduct(productId, reason),
    onSuccess: () => invalidateModerationQueries(queryClient),
  })

  const bulkApproveMutation = useMutation({
    mutationFn: (productIds) => productModerationService.bulkApproveModerationProducts(productIds),
    onSuccess: () => invalidateModerationQueries(queryClient),
  })

  const bulkRejectMutation = useMutation({
    mutationFn: ({ productIds, reason }) =>
      productModerationService.bulkRejectModerationProducts(productIds, reason),
    onSuccess: () => invalidateModerationQueries(queryClient),
  })

  return {
    approve: approveMutation.mutateAsync,
    approving: approveMutation.isPending,
    reject: rejectMutation.mutateAsync,
    rejecting: rejectMutation.isPending,
    bulkApprove: bulkApproveMutation.mutateAsync,
    bulkApproving: bulkApproveMutation.isPending,
    bulkReject: bulkRejectMutation.mutateAsync,
    bulkRejecting: bulkRejectMutation.isPending,
  }
}

/**
 * @param {{ status?: string, storeId?: number|string, search?: string, page?: number, limit?: number }} params
 * @param {{ enabled?: boolean }} [options]
 */
export function useModerationQueueViewModel(params, options = {}) {
  const apiParams = {
    status: params.status || 'PENDING',
    ...(params.storeId ? { store_id: Number(params.storeId) } : {}),
    ...(params.search ? { search: params.search } : {}),
    page: params.page || 1,
    limit: params.limit || 20,
  }

  const queueQuery = useQuery({
    queryKey: queryKeys.moderationQueue.queue(apiParams),
    queryFn: ({ signal }) => productModerationService.getModerationQueue(apiParams, { signal }),
    enabled: options.enabled !== false,
  })

  const data = queueQuery.data
  const items = Array.isArray(data?.items) ? data.items : []
  const count = typeof data?.count === 'number' ? data.count : 0
  const pendingCount = typeof data?.pending_count === 'number' ? data.pending_count : 0

  const decisions = useModerationDecisionMutations()

  return {
    items,
    count,
    pendingCount,
    loading: queueQuery.isFetching,
    error: queueQuery.error?.message ?? null,
    refetch: queueQuery.refetch,
    ...decisions,
  }
}

/**
 * Lightweight pending-count poll for the nav badge. Cheap: `limit: 1` — only `pending_count`
 * (the total awaiting review regardless of pagination) is used, `items`/`count` are discarded.
 * @param {{ enabled?: boolean }} [options]
 */
export function useModerationPendingCount(options = {}) {
  const query = useQuery({
    queryKey: queryKeys.moderationQueue.pendingCount(),
    queryFn: ({ signal }) =>
      productModerationService.getModerationQueue({ status: 'PENDING', page: 1, limit: 1 }, { signal }),
    enabled: options.enabled !== false,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
  return typeof query.data?.pending_count === 'number' ? query.data.pending_count : 0
}

/**
 * A single queue item's full detail for the review screen. There is no dedicated
 * `GET /api/products/moderation/{id}` endpoint (see product-moderation-dashboard-spec.md §3) —
 * moderation-specific fields (`moderation_status`, `pending_changes`, `rejection_reason`,
 * `has_pending_changes`) only come back from the queue list. This combines the regular product
 * detail (works for any id, including a direct/bookmarked URL) with whatever queue page for this
 * product is already cached from the list screen the admin came from — if none is cached (e.g. a
 * cold direct navigation), moderation-specific fields come back null and the screen degrades to
 * showing the base product with an explanation instead of the diff.
 * @param {string | number} id
 */
export function useModerationReviewViewModel(id) {
  const queryClient = useQueryClient()

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: id != null && id !== '',
  })

  const cachedQueueItem = findCachedModerationQueueItem(queryClient, id)
  const raw = productQuery.data

  const moderationStatus = raw?.moderation_status ?? cachedQueueItem?.moderation_status ?? null
  const hasPendingChanges = Boolean(
    raw?.has_pending_changes ?? cachedQueueItem?.has_pending_changes ?? false,
  )
  const pendingChanges = raw?.pending_changes ?? cachedQueueItem?.pending_changes ?? null
  const rejectionReason = raw?.rejection_reason ?? cachedQueueItem?.rejection_reason ?? ''
  const submittedAt = raw?.submitted_at ?? cachedQueueItem?.submitted_at ?? null
  // Neither the detail response nor a cached queue page had moderation fields — most likely a
  // cold direct navigation to this id. Approve/reject still work (they only need the id), but the
  // diff and current status can't be shown reliably.
  const moderationDataUnavailable = moderationStatus == null && !cachedQueueItem

  return {
    product: raw ?? null,
    loading: productQuery.isFetching,
    error: productQuery.error?.message ?? null,
    refetch: productQuery.refetch,
    moderationStatus,
    hasPendingChanges,
    pendingChanges,
    rejectionReason,
    submittedAt,
    moderationDataUnavailable,
  }
}

/** Scans every cached moderation-queue page for an item with this id — see useModerationReviewViewModel. */
function findCachedModerationQueueItem(queryClient, id) {
  const target = String(id)
  const cached = queryClient.getQueriesData({ queryKey: queryKeys.moderationQueue.root })
  for (const [, data] of cached) {
    const items = Array.isArray(data?.items) ? data.items : []
    const match = items.find((item) => String(item?.id) === target)
    if (match) return match
  }
  return null
}
