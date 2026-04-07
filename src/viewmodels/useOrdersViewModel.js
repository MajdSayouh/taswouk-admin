/**
 * Orders ViewModel — loads orders via `orderService`.
 * When `/api/orders` is available on the server, the same hook will show live data.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as orderService from '../services/orderService.js'
import { createOrder } from '../models/Order.js'

function normalizeOrderDto(raw) {
  if (raw == null || typeof raw !== 'object') {
    return createOrder({ id: 'unknown', number: '—', customerName: '—', total: 0, status: 'pending' })
  }
  const r = raw
  return createOrder({
    id: String(r.id ?? r.order_id ?? ''),
    number: r.number ?? r.order_number ?? (r.id != null ? `#${r.id}` : '—'),
    customerName: r.customer_name ?? r.customerName ?? r.buyer_name ?? '—',
    total: Number(r.total ?? r.amount ?? r.grand_total ?? 0),
    status: (r.status ?? 'pending').toLowerCase(),
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  })
}

export function useOrdersViewModel() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await orderService.getOrders()
      const list = Array.isArray(data) ? data : []
      setOrders(list.map(normalizeOrderDto))
    } catch (err) {
      setError(err?.message ?? 'Failed to load orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const summary = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      paid: orders.filter((o) => o.status === 'paid').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
    }),
    [orders],
  )

  return {
    orders,
    summary,
    loading,
    error,
    fetchOrders,
  }
}
