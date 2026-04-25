/**
 * Orders ViewModel — loads orders via `orderService` (GET `/api/orders/`).
 */
import { useQuery } from '@tanstack/react-query'
import * as orderService from '../services/orderService.js'
import { createOrder } from '../models/Order.js'
import { queryKeys } from '../query/queryKeys.js'

function normalizeOrderDto(raw) {
  if (raw == null || typeof raw !== 'object') {
    return createOrder({ id: 'unknown', number: '—', customerName: '—', total: 0, status: 'pending' })
  }
  const r = raw
  const cid = r.customer_id ?? r.customerId
  const customerLabel =
    r.customer_name ??
    r.customerName ??
    (cid != null ? `Customer #${cid}` : '—')
  return createOrder({
    id: String(r.id ?? r.order_id ?? ''),
    number: r.number ?? r.order_number ?? (r.id != null ? `#${r.id}` : '—'),
    customerName: customerLabel,
    total: Number(r.total ?? r.amount ?? r.grand_total ?? 0),
    status: (r.status ?? 'pending').toLowerCase(),
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  })
}

export function useOrdersViewModel() {
  const query = useQuery({
    queryKey: queryKeys.orders.all(),
    queryFn: async () => {
      const data = await orderService.getOrders()
      const list = Array.isArray(data) ? data : []
      return list.map(normalizeOrderDto)
    },
  })

  return {
    orders: query.data ?? [],
    loading: query.isFetching,
    error: query.error?.message ?? null,
    fetchOrders: query.refetch,
  }
}
