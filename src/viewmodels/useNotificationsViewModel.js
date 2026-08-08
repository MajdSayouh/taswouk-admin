import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  broadcastNotification,
  listNotifications,
  markNotificationRead,
  sendNotificationToUsers,
} from '../services/notificationService.js'
import { queryKeys } from '../query/queryKeys.js'

async function invalidateNotificationQueries(queryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() }),
  ])
}

export function useNotificationsViewModel() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: ({ signal }) => listNotifications({ signal }),
  })

  const broadcastMutation = useMutation({
    mutationFn: /** @param {{ title: string; body: string; data?: Record<string, unknown> | null }} p */ (p) =>
      broadcastNotification(p),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient)
    },
  })

  const markReadMutation = useMutation({
    mutationFn: /** @param {number} notificationId */ (notificationId) =>
      markNotificationRead(notificationId),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient)
    },
  })

  const sendToUsersMutation = useMutation({
    mutationFn: /** @param {{ title: string; body: string; user_ids: number[]; data?: Record<string, unknown> | null; type?: string }} p */ (
      p,
    ) => sendNotificationToUsers(p),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient)
    },
  })

  return {
    notifications: query.data ?? [],
    loading: query.isFetching,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    broadcastMutation,
    markReadMutation,
    sendToUsersMutation,
  }
}
