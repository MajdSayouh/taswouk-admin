/**
 * Dashboard ViewModel — aggregates real API data where the Taswouk backend exposes it.
 * Revenue/customer widgets stay static placeholders until matching APIs exist in OpenAPI.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as productService from '../services/productService.js'
import * as orderService from '../services/orderService.js'
import { createProduct } from '../models/Product.js'
import { createOrder } from '../models/Order.js'

function mapItemToProduct(item) {
  return createProduct({
    id: String(item.id ?? ''),
    name: item.name ?? '',
    sku: item.id != null ? `ITM-${item.id}` : '',
    category: item.description?.trim() ? item.description.slice(0, 48) : '—',
    price: item.price,
    stock: item.quantity,
    isActive: item.is_active ?? true,
  })
}

function mapOrderDto(raw) {
  if (raw == null || typeof raw !== 'object') return null
  const r = raw
  return createOrder({
    id: String(r.id ?? ''),
    number: r.number ?? r.order_number ?? (r.id != null ? `#${r.id}` : '—'),
    customerName: r.customer_name ?? r.customerName ?? '—',
    total: Number(r.total ?? 0),
    status: (r.status ?? 'pending').toLowerCase(),
  })
}

export function useDashboardViewModel() {
  const [productsLoading, setProductsLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [productsError, setProductsError] = useState(null)
  const [ordersError, setOrdersError] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [productCount, setProductCount] = useState(0)
  const [orderCount, setOrderCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const items = await productService.getProducts()
      const mapped = Array.isArray(items) ? items.map(mapItemToProduct) : []
      setProductCount(mapped.length)
      setTopProducts(mapped.slice(0, 3))
    } catch (err) {
      setProductsError(err?.message ?? 'Failed to load products')
      setTopProducts([])
      setProductCount(0)
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const data = await orderService.getOrders()
      const list = Array.isArray(data) ? data : []
      const mapped = list.map(mapOrderDto).filter(Boolean)
      setOrderCount(mapped.length)
      setPendingOrdersCount(mapped.filter((o) => o.status === 'pending').length)
      setRecentOrders(mapped.slice(0, 3))
    } catch (err) {
      setOrdersError(err?.message ?? 'Failed to load orders')
      setRecentOrders([])
      setOrderCount(0)
      setPendingOrdersCount(0)
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
    loadOrders()
  }, [loadProducts, loadOrders])

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
      loadProducts()
      loadOrders()
    },
  }
}
