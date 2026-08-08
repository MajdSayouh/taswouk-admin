/**
 * Dashboard ViewModel — aggregates real API data where the Jomran backend exposes it.
 * Revenue and buyer counts are derived from loaded orders (no separate revenue API).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as adminService from '../services/adminService.js'
import { fetchOrdersList } from '../query/fetchers/ordersList.js'
import { fetchProductsList } from '../query/fetchers/productList.js'
import { queryKeys } from '../query/queryKeys.js'
import { useAuthStore, isAdminRole } from '../store/authStore.js'
import { FULFILLMENT_PIPELINE } from '../utils/orderFulfillment.js'

function startOfTodayMs() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** YYYY-MM-DD in local time */
function dateKeyFromMs(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param {unknown[]} users
 * @returns {{ key: string; count: number }[]}
 */
function aggregateUsersByRole(users) {
  if (!Array.isArray(users) || users.length === 0) return []
  /** @type {Record<string, number>} */
  const counts = {}
  for (const u of users) {
    const r = String(u?.role ?? 'UNKNOWN').toUpperCase()
    counts[r] = (counts[r] ?? 0) + 1
  }
  const preferred = ['ADMIN', 'SELLER', 'CUSTOMER', 'DELIVERY', 'UNKNOWN']
  /** @type {string[]} */
  const keys = []
  const used = new Set()
  for (const k of preferred) {
    if ((counts[k] ?? 0) > 0) {
      keys.push(k)
      used.add(k)
    }
  }
  for (const k of Object.keys(counts).sort()) {
    if (!used.has(k)) keys.push(k)
  }
  return keys.map((key) => ({ key: key.toLowerCase(), count: counts[key] ?? 0 }))
}

function buildLast7DayMeta() {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = dateKeyFromMs(d.getTime())
    if (!key) continue
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
    })
  }
  return out
}

const PIE_STATUS_KEYS = [...FULFILLMENT_PIPELINE, 'cancelled', 'other']

/** @param {unknown} data */
function normalizeProductsQueryData(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.rows)) return data.rows
  return []
}

/** @param {unknown} data */
function normalizeProductsQueryTotal(data) {
  if (data && typeof data === 'object' && typeof data.total === 'number') return data.total
  if (Array.isArray(data)) return data.length
  return 0
}

/** @param {unknown} data */
function normalizeOrdersQueryData(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.rows)) return data.rows
  return []
}

function aggregateOrders(rows) {
  /** @type {Record<string, number>} */
  const statusCounts = {}
  for (const key of FULFILLMENT_PIPELINE) {
    statusCounts[key] = 0
  }
  statusCounts.cancelled = 0
  statusCounts.other = 0

  const dayMeta = buildLast7DayMeta()
  /** @type {Record<string, { count: number; revenue: number }>} */
  const byDay = {}
  for (const dm of dayMeta) {
    byDay[dm.key] = { count: 0, revenue: 0 }
  }

  let deliveredRevenue = 0
  let pipelineValue = 0
  let cancelledRevenue = 0
  let todayDeliveredTotal = 0
  const todayStart = startOfTodayMs()
  /** @type {Set<string>} */
  const buyerKeys = new Set()

  for (const o of rows) {
    const st = String(o.status || '').toLowerCase()
    if (statusCounts[st] != null) {
      statusCounts[st] += 1
    } else if (st === 'cancelled') {
      statusCounts.cancelled += 1
    } else {
      statusCounts.other += 1
    }

    const amt = Number(o.total ?? 0)
    const created = Date.parse(o.createdAt)
    const isToday = !Number.isNaN(created) && created >= todayStart

    if (st === 'delivered') {
      deliveredRevenue += amt
      if (isToday) todayDeliveredTotal += amt
    } else if (st === 'cancelled') {
      cancelledRevenue += amt
    } else {
      pipelineValue += amt
    }

    if (!Number.isNaN(created)) {
      const dk = dateKeyFromMs(created)
      if (dk && byDay[dk]) {
        byDay[dk].count += 1
        byDay[dk].revenue += amt
      }
    }

    const bk = String(o.customerName ?? '').trim() || String(o.id ?? '')
    buyerKeys.add(bk)
  }

  const chartByStatus = FULFILLMENT_PIPELINE.map((key) => ({
    key,
    count: statusCounts[key] ?? 0,
  }))

  const pipelineMix = [
    { key: 'delivered', value: deliveredRevenue },
    { key: 'pipeline', value: pipelineValue },
  ]

  const pieByStatus = PIE_STATUS_KEYS.map((key) => ({
    key,
    count: statusCounts[key] ?? 0,
  }))

  const dailyTrend = dayMeta.map(({ key, label }) => ({
    key,
    label,
    orders: byDay[key]?.count ?? 0,
    revenue: byDay[key]?.revenue ?? 0,
  }))

  const outcomeRevenue = [
    { key: 'delivered', value: deliveredRevenue },
    { key: 'pipeline', value: pipelineValue },
    { key: 'cancelled', value: cancelledRevenue },
  ]

  return {
    statusCounts,
    deliveredRevenue,
    pipelineValue,
    cancelledRevenue,
    todayDeliveredTotal,
    uniqueBuyerCount: buyerKeys.size,
    chartByStatus:
      chartByStatus.length > 0
        ? chartByStatus
        : FULFILLMENT_PIPELINE.map((key) => ({ key, count: 0 })),
    pipelineMix,
    pieByStatus,
    dailyTrend,
    outcomeRevenue,
  }
}

export function useDashboardViewModel() {
  const userRole = useAuthStore((s) => s.user?.role)
  const isAdmin = isAdminRole(userRole)

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({}),
    queryFn: ({ signal }) => fetchProductsList({ signal }),
  })

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.all(),
    queryFn: fetchOrdersList,
  })

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers.all(),
    queryFn: () => adminService.listAdminUsers(),
    enabled: isAdmin,
  })

  const productsError = productsQuery.error?.message ?? null
  const ordersError = ordersQuery.error?.message ?? null
  const usersError = usersQuery.error?.message ?? null

  const productRows = normalizeProductsQueryData(productsQuery.data)
  const productTotal = normalizeProductsQueryTotal(productsQuery.data)
  const orderRows = normalizeOrdersQueryData(ordersQuery.data)

  const topProducts = useMemo(() => productRows.slice(0, 3), [productRows])
  const recentOrders = useMemo(() => orderRows.slice(0, 3), [orderRows])
  const productCount = productTotal || productRows.length
  const orderCount = orderRows.length
  const pendingOrdersCount = useMemo(
    () => orderRows.filter((o) => o.status === 'pending').length,
    [orderRows],
  )

  const orderAggregates = useMemo(() => aggregateOrders(orderRows), [orderRows])

  const usersRaw = usersQuery.data
  const userList = Array.isArray(usersRaw?.users) ? usersRaw.users : []
  const totalUserAccounts =
    typeof usersRaw?.count === 'number' ? usersRaw.count : userList.length
  const usersByRole = useMemo(() => aggregateUsersByRole(userList), [userList])

  const stats = useMemo(() => {
    return {
      deliveredRevenue: orderAggregates.deliveredRevenue,
      todayDeliveredTotal: orderAggregates.todayDeliveredTotal,
      pipelineValue: orderAggregates.pipelineValue,
      totalOrders: orderCount,
      pendingOrders: pendingOrdersCount,
      uniqueBuyers: orderAggregates.uniqueBuyerCount,
      activeProducts: productCount,
    }
  }, [orderAggregates, orderCount, pendingOrdersCount, productCount])

  return {
    stats,
    recentOrders,
    topProducts,
    chartByStatus: orderAggregates.chartByStatus,
    pipelineMix: orderAggregates.pipelineMix,
    pieByStatus: orderAggregates.pieByStatus,
    dailyTrend: orderAggregates.dailyTrend,
    outcomeRevenue: orderAggregates.outcomeRevenue,
    usersByRole,
    totalUserAccounts,
    isAdmin,
    ordersLoading: ordersQuery.isLoading,
    productsLoading: productsQuery.isLoading,
    usersLoading: isAdmin && usersQuery.isLoading,
    chartsReady: !ordersQuery.isLoading,
    loading: productsQuery.isLoading && ordersQuery.isLoading,
    productsError,
    ordersError,
    usersError,
    refetch: () => {
      productsQuery.refetch()
      ordersQuery.refetch()
      if (isAdmin) usersQuery.refetch()
    },
  }
}
