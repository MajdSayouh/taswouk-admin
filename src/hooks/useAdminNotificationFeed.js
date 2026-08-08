import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationRead,
} from '../services/notificationService.js'
import { queryKeys } from '../query/queryKeys.js'
import {
  getRecentDashboardNotifications,
  subscribeDashboardNotifications,
} from '../firebase/dashboardMessaging.js'

/**
 * Bell feed: live FCM items (this session) + server notification log (GET /api/notifications/).
 * Aligns with push_notification_system doc (bell lists recent activity).
 * Unread badge uses GET /api/notifications/unread-count when available.
 */

/**
 * @param {Record<string, unknown>} row
 */
function serverLogClickUrl(row) {
  const type = String(row.type || '').toUpperCase()
  if (type.includes('ORDER') || type === 'ORDER_STATUS') return '/orders'
  return '/notifications'
}

/**
 * @param {Record<string, unknown>} row
 */
function serverCreatedAt(row) {
  const raw = row.created_at
  if (!raw) return 0
  const t = new Date(String(raw)).getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * @param {boolean} enabled — authenticated dashboard session
 */
export function useAdminNotificationFeed(enabled) {
  const queryClient = useQueryClient()
  const [liveItems, setLiveItems] = useState(getRecentDashboardNotifications)

  useEffect(() => {
    if (!enabled) {
      setLiveItems([])
      return undefined
    }
    return subscribeDashboardNotifications(setLiveItems)
  }, [enabled])

  const logQuery = useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: ({ signal }) => listNotifications({ signal }),
    enabled: Boolean(enabled),
    staleTime: 30_000,
  })

  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) => getUnreadNotificationCount({ signal }),
    enabled: Boolean(enabled),
    staleTime: 15_000,
  })

  const items = useMemo(() => {
    const live = (liveItems || []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      url: n.url,
      createdAt: n.createdAt,
      source: /** @type {'live'} */ ('live'),
      sortKey: n.createdAt || 0,
    }))

    const rows = Array.isArray(logQuery.data) ? logQuery.data : []
    const fromServer = rows.slice(0, 20).map((row) => ({
      id: `log-${row.id}`,
      title: String(row.title ?? ''),
      body: String(row.body ?? ''),
      url: serverLogClickUrl(row),
      createdAt: serverCreatedAt(row),
      source: /** @type {'log'} */ ('log'),
      notificationId: Number(row.id),
      isRead: Boolean(row.is_read),
      status: String(row.status ?? ''),
      sortKey: serverCreatedAt(row),
    }))

    return [...live, ...fromServer]
      .sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0))
      .slice(0, 40)
      .map(({ sortKey: _sortKey, ...rest }) => rest)
  }, [liveItems, logQuery.data])

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => markNotificationRead(notificationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() }),
      ])
    },
  })

  function markBellItemRead(item) {
    if (item?.source !== 'log' || item?.isRead) return Promise.resolve()
    const id = Number(item?.notificationId)
    if (!Number.isInteger(id) || id <= 0) return Promise.resolve()
    return markReadMutation.mutateAsync(id)
  }

  return {
    items,
    logLoading: logQuery.isFetching,
    refetchLog: logQuery.refetch,
    unreadCount: unreadQuery.data?.count ?? 0,
    refetchUnread: unreadQuery.refetch,
    markBellItemRead,
  }
}
