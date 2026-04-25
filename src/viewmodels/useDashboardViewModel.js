/**
 * Dashboard ViewModel — aggregates real API data where the Jomran backend exposes it.
 * Revenue/customer widgets stay static placeholders until matching APIs exist in OpenAPI.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as productService from '../services/productService.js'
import * as orderService from '../services/orderService.js'
import { createProduct } from '../models/Product.js'
import { createOrder } from '../models/Order.js'
import { queryKeys } from '../query/queryKeys.js'

function mapItemToProduct(item) {
  const storeId = item.store_id
  return {
    ...createProduct({
      id: String(item.id ?? ''),
      name: item.name ?? '',
      sku: item.id != null ? `PRD-${item.id}` : '',
      category: item.description?.trim()
        ? String(item.description).slice(0, 48)
        : storeId != null
          ? `Store #${storeId}`
          : '—',
      price: item.price,
      stock: 0,
      isActive: item.is_active ?? true,
    }),
    storeId: storeId != null ? String(storeId) : '',
  }
}

function mapOrderDto(raw) {
  if (raw == null || typeof raw !== 'object') return null
  const r = raw
  const cid = r.customer_id ?? r.customerId
  const customerLabel =
    r.customer_name ?? r.customerName ?? (cid != null ? `Customer #${cid}` : '—')
  return createOrder({
    id: String(r.id ?? ''),
    number: r.number ?? r.order_number ?? (r.id != null ? `#${r.id}` : '—'),
    customerName: customerLabel,
    total: Number(r.total ?? 0),
    status: (r.status ?? 'pending').toLowerCase(),
  })
}

export function useDashboardViewModel() {
  const productsQuery = useQuery({
    queryKey: [...queryKeys.products.root, 'dashboard-preview'],
    queryFn: async () => {
      const items = await productService.getProducts()
      const mapped = Array.isArray(items) ? items.map(mapItemToProduct) : []
      return {
        rows: mapped,
        count: mapped.length,
        top: mapped.slice(0, 3),
      }
    },
  })

  const ordersQuery = useQuery({
    queryKey: [...queryKeys.orders.all(), 'dashboard-preview'],
    queryFn: async () => {
      const data = await orderService.getOrders()
      const list = Array.isArray(data) ? data : []
      const mapped = list.map(mapOrderDto).filter(Boolean)
      return {
        rows: mapped,
        count: mapped.length,
        pending: mapped.filter((o) => o.status === 'pending').length,
        recent: mapped.slice(0, 3),
      }
    },
  })

  const productsLoading = productsQuery.isFetching
  const ordersLoading = ordersQuery.isFetching
  const productsError = productsQuery.error?.message ?? null
  const ordersError = ordersQuery.error?.message ?? null

  const topProducts = productsQuery.data?.top ?? []
  const recentOrders = ordersQuery.data?.recent ?? []
  const productCount = productsQuery.data?.count ?? 0
  const orderCount = ordersQuery.data?.count ?? 0
  const pendingOrdersCount = ordersQuery.data?.pending ?? 0

  const stats = useMemo(() => {
    return {
      totalRevenue: 45230,
      todayRevenue: 1320,
      totalOrders: orderCount,
      pendingOrders: pendingOrdersCount,
      totalCustomers: 341,
      activeProducts: productCount,
    }
  }, [orderCount, pendingOrdersCount, productCount])

  return {
    stats,
    recentOrders,
    topProducts,
    loading: productsLoading || ordersLoading,
    productsError,
    ordersError,
    refetch: () => {
      productsQuery.refetch()
      ordersQuery.refetch()
    },
  }
}
