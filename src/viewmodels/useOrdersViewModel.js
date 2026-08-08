/**
 * Orders ViewModel — loads orders via `orderService` (GET `/api/orders/`).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchOrdersList } from '../query/fetchers/ordersList.js'
import { queryKeys } from '../query/queryKeys.js'

export function useOrdersViewModel() {
  const query = useQuery({
    queryKey: queryKeys.orders.all(),
    queryFn: fetchOrdersList,
  })

  const orders = useMemo(() => query.data ?? [], [query.data])

  return {
    orders,
    loading: query.isFetching,
    error: query.error?.message ?? null,
    fetchOrders: query.refetch,
  }
}
