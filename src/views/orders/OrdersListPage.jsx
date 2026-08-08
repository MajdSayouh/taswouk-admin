// View: orders — toolbar + column filter dropdowns + expandable fulfillment stepper.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useOrdersViewModel } from '../../viewmodels/useOrdersViewModel'
import { assignDeliveryOrderForType, getOrderById, updateOrderStatus } from '../../services/orderService.js'
import { queryClient } from '../../query/queryClient.js'
import { queryKeys } from '../../query/queryKeys.js'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { matchesStatusMultiFilter, rowMatchesSearch } from '../../utils/tableFilters.js'
import { OrderFulfillmentStepper } from '../../components/orders/OrderFulfillmentStepper.jsx'
import { OrderDetailModal } from '../../components/orders/OrderDetailModal.jsx'
import { ExternalOrderTag } from '../../components/orders/ExternalOrderTag.jsx'
import { ExternalOrderProductCell } from '../../components/orders/ExternalOrderProductCell.jsx'
import { useOrderDriverAssignments } from '../../hooks/useOrderDriverAssignments.js'
import { getMockDriverById, MOCK_DRIVERS } from '../../mock/driversAndOrdersMock.js'
import { useDriversViewModel } from '../../viewmodels/useDriversViewModel.js'
import { useAuthStore, isAdminRole } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import {
  Table,
  Tag,
  Button,
  Space,
  Alert,
  Spin,
  Select,
  Button as AntButton,
  message,
  Tooltip,
  Popconfirm,
  Pagination,
  Empty,
} from 'antd'
import { canAdminCancelOrder } from '../../utils/orderFulfillment.js'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

/** Aligns with AssignDeliverySchema: admin may assign while order is pending / confirmed / preparing. */
const ASSIGN_DRIVER_STATUSES = new Set(['pending', 'confirmed', 'preparing'])

/** Show driver name (read-only) instead of assign UI once pipeline passes preparation / delivery. */
const DRIVER_ASSIGNED_READONLY_STATUSES = new Set(['preparing', 'out_for_delivery', 'delivered'])

const DEFAULT_PAGE_SIZE = 50

/**
 * @param {{ name: string; active: boolean }} d
 * @param {import('i18next').TFunction} t
 */
function driverOptionLabel(d, t) {
  return d.active ? d.name : `${d.name} (${t('drivers.inactive')})`
}

/**
 * API delivery rows first; if none, demo mock drivers. Always include any locally assigned id.
 *
 * @param {Array<{ id: string; name: string; active: boolean }>} apiDrivers
 * @param {Record<string, string>} assignments
 */
function buildDriverSelectOptions(apiDrivers, assignments, t) {
  /** @type {{ id: string; name: string; active: boolean }[]} */
  const primaryRows =
    apiDrivers.length > 0
      ? apiDrivers.map((d) => ({ id: d.id, name: d.name, active: d.active }))
      : MOCK_DRIVERS.map((d) => ({
          id: d.id,
          name: d.name,
          active: d.active,
        }))

  const options = primaryRows.map((d) => ({
    value: d.id,
    label: driverOptionLabel(d, t),
  }))

  const map = new Map(options.map((o) => [String(o.value), o]))
  const assignedIds = [...new Set(Object.values(assignments).filter(Boolean).map(String))]
  for (const aid of assignedIds) {
    if (map.has(aid)) continue
    const api = apiDrivers.find((d) => String(d.id) === aid)
    const mock = getMockDriverById(aid)
    let label
    if (api) label = driverOptionLabel(api, t)
    else if (mock) label = driverOptionLabel({ name: mock.name, active: mock.active }, t)
    else label = t('orders.driverOrphan', { id: aid })
    map.set(aid, { value: aid, label })
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * @param {string | number | null | undefined} drvId
 * @param {Array<{ id: string; name: string; phone: string }>} apiDrivers
 */
function resolveAssignedDriverDisplay(drvId, apiDrivers) {
  if (drvId == null || drvId === '') return null
  const sid = String(drvId)
  const api = apiDrivers.find((d) => String(d.id) === sid)
  if (api) return { name: api.name, phone: api.phone }
  const mock = getMockDriverById(drvId)
  if (mock) return { name: mock.name, phone: mock.phone }
  return { name: `#${sid}`, phone: '—' }
}

/**
 * Prefer API delivery user id on the order; fall back to mirrored localStorage after assign.
 * @param {{ deliveryUserId?: string }} record
 * @param {(id: string | number) => string | null} getDriverId
 */
function getEffectiveDriverId(record, getDriverId) {
  const api = record?.deliveryUserId
  if (api != null && String(api).trim() !== '') return String(api)
  const local = getDriverId(record.id)
  return local != null && String(local).trim() !== '' ? String(local) : null
}

function orderTypeLabel(record, t) {
  const type = String(record?.orderType ?? '').toLowerCase()
  if (type === 'mall') return t('orders.orderTypes.mall')
  if (record?.isExternal || type === 'external') return t('orders.orderTypes.external')
  if (type === 'store') return t('orders.orderTypes.store')
  return type ? type.replace(/_/g, ' ') : t('shared.emDash')
}

/** @param {{ options: { value: string; label: string }[]; value: string[] | null | undefined; onApply: (v: string[] | null) => void; confirm: () => void; t: import('i18next').TFunction }} props */
function StatusColumnFilter({ options, value, onApply, confirm, t }) {
  const [local, setLocal] = useState(value || [])
  useEffect(() => {
    setLocal(value || [])
  }, [value])
  return (
    <div className="p-2 w-56" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder={t('orders.statusesPlaceholder')}
        className="w-full mb-2"
        value={local}
        onChange={setLocal}
        options={options}
      />
      <Space className="w-full justify-end">
        <AntButton
          size="small"
          type="primary"
          onClick={() => {
            onApply(local.length ? local : null)
            confirm()
          }}
        >
          {t('shared.apply')}
        </AntButton>
        <AntButton
          size="small"
          onClick={() => {
            setLocal([])
            onApply(null)
            confirm()
          }}
        >
          {t('shared.reset')}
        </AntButton>
      </Space>
    </div>
  )
}

export function OrdersListPage() {
  const { t } = useTranslation('pages')
  const user = useAuthStore((s) => s.user)
  const isAdmin = Boolean(user && isAdminRole(user.role))
  const { orders, loading, error, fetchOrders } = useOrdersViewModel()
  const { assignments, assign, getDriverId } = useOrderDriverAssignments()
  const { drivers: apiDrivers, loading: driversLoading } = useDriversViewModel({
    fetchOnMount: isAdmin,
  })

  /** Pending driver selection per order (`null` = user cleared select; `undefined` = no draft). */
  const [pendingDriverEdits, setPendingDriverEdits] = useState(
    /** @type {Record<string, string | null | undefined>} */ ({}),
  )
  const [assigningOrderId, setAssigningOrderId] = useState(/** @type {string | null} */ (null))
  const [acceptingOrderId, setAcceptingOrderId] = useState(/** @type {string | null} */ (null))
  const [cancellingOrderId, setCancellingOrderId] = useState(/** @type {string | null} */ (null))
  const [detailOrder, setDetailOrder] = useState(
    /** @type {{ id: string; record: Record<string, unknown>; deliveryUserId: string | null; driverName: string | null } | null} */ (
      null
    )
  )

  const openOrderDetail = useCallback(
    (record) => {
      const drvId = getEffectiveDriverId(record, getDriverId)
      const drv = drvId ? resolveAssignedDriverDisplay(drvId, apiDrivers) : null
      setDetailOrder({
        id: String(record.id),
        record: /** @type {Record<string, unknown>} */ (record),
        deliveryUserId: drvId,
        driverName: drv?.name ?? null,
      })
    },
    [apiDrivers, getDriverId],
  )

  const handleAcceptOrder = useCallback(
    async (record) => {
      const idKey = String(record.id)
      const orderNum = Number(record.id)
      if (!Number.isInteger(orderNum) || orderNum <= 0 || record.isMock) return
      try {
        setAcceptingOrderId(idKey)
        await updateOrderStatus(orderNum, 'confirmed', record.orderType)
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
        message.success(t('orders.acceptSuccess'))
      } catch (err) {
        const detail = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
        message.error(detail ? `${t('orders.acceptError')} ${detail}` : t('orders.acceptError'))
      } finally {
        setAcceptingOrderId(null)
      }
    },
    [t],
  )

  const handleCancelOrder = useCallback(
    async (record) => {
      const idKey = String(record.id)
      const orderNum = Number(record.id)
      if (!Number.isInteger(orderNum) || orderNum <= 0 || record.isMock) return
      if (!canAdminCancelOrder(record.status)) return
      try {
        setCancellingOrderId(idKey)
        await updateOrderStatus(orderNum, 'cancelled', record.orderType)
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
        message.success(t('orders.cancelSuccess'))
      } catch (err) {
        const detail = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
        message.error(detail ? `${t('orders.cancelError')} ${detail}` : t('orders.cancelError'))
        throw err
      } finally {
        setCancellingOrderId(null)
      }
    },
    [t],
  )

  const handleApplyDriver = useCallback(
    async (record) => {
      const idKey = String(record.id)
      const pending = pendingDriverEdits[idKey]
      if (pending === undefined) return

      const saved = getEffectiveDriverId(record, getDriverId)
      const target = pending === null ? null : String(pending)

      if (String(saved ?? '') === String(target ?? '')) {
        setPendingDriverEdits((p) => {
          const n = { ...p }
          delete n[idKey]
          return n
        })
        return
      }

      if (!isAdmin) {
        assign(record.id, target)
        setPendingDriverEdits((p) => {
          const n = { ...p }
          delete n[idKey]
          return n
        })
        message.success(t('orders.assignSuccess'))
        return
      }

      if (target === null || target === '') {
        assign(record.id, null)
        setPendingDriverEdits((p) => {
          const n = { ...p }
          delete n[idKey]
          return n
        })
        message.success(t('orders.assignClearedLocal'))
        return
      }

      const orderNum = Number(record.id)
      const driverNum = Number(target)
      const orderOk = Number.isInteger(orderNum) && orderNum > 0
      const driverOk = Number.isInteger(driverNum) && driverNum > 0

      if (!orderOk || record.isMock) {
        assign(record.id, target)
        setPendingDriverEdits((p) => {
          const n = { ...p }
          delete n[idKey]
          return n
        })
        message.warning(t('orders.assignDemoLocal'))
        return
      }

      if (!driverOk) {
        message.error(t('orders.assignError'))
        return
      }

      try {
        setAssigningOrderId(idKey)

        // The row's status can be a couple of minutes stale (React Query cache) — another
        // admin action or the driver app itself can move an order past "confirmed" in that
        // window. Re-check the live status right before assigning instead of trusting the
        // cached row, so we can show a clear message and refresh the row locally instead of
        // firing a doomed request and surfacing a raw backend error.
        let liveStatus = null
        try {
          const fresh = await getOrderById(orderNum, record.orderType)
          liveStatus = String(fresh?.status ?? '').toLowerCase() || null
        } catch {
          // If the live check itself fails (network hiccup, etc.), fall through and let the
          // assign call's own error handling report the failure.
        }
        if (liveStatus && !ASSIGN_DRIVER_STATUSES.has(liveStatus)) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
          message.warning(t('orders.assignStatusChanged', { status: liveStatus }))
          setPendingDriverEdits((p) => {
            const n = { ...p }
            delete n[idKey]
            return n
          })
          return
        }

        await assignDeliveryOrderForType(orderNum, driverNum, record.orderType)
        assign(record.id, String(driverNum))
        setPendingDriverEdits((p) => {
          const n = { ...p }
          delete n[idKey]
          return n
        })
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
        message.success(t('orders.assignSuccess'))
      } catch (err) {
        const detail = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
        message.error(detail ? `${t('orders.assignError')} ${detail}` : t('orders.assignError'))
        // The failure may itself be a stale-status race (backend rejected for a reason not
        // caught by the pre-check above) — refresh so the row reflects reality either way.
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      } finally {
        setAssigningOrderId(null)
      }
    },
    [assign, getDriverId, isAdmin, pendingDriverEdits, t],
  )

  const driverOptions = useMemo(
    () => buildDriverSelectOptions(apiDrivers, assignments, t),
    [apiDrivers, assignments, t],
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  /** @type {string[]} */
  const [statusFilter, setStatusFilter] = useState([])

  const [colOrder, setColOrder] = useState('')
  const [colCustomer, setColCustomer] = useState('')
  const [colTotal, setColTotal] = useState('')
  /** @type {string[] | null} */
  const [colStatus, setColStatus] = useState(null)

  const statusOptions = useMemo(() => {
    const present = new Set(orders.map((o) => String(o.status || '').toLowerCase()))
    return ORDER_STATUSES.filter((s) => present.has(s)).map((s) => ({
      value: s,
      label: t(`orders.status.${s}`),
    }))
  }, [orders, t])

  const displayData = useMemo(() => {
    return orders.filter((o) => {
      if (!matchesStatusMultiFilter(statusFilter, o.status)) return false
      if (!rowMatchesSearch(
        search,
        o.number,
        o.customerName,
        o.id,
        o.status,
        o.total,
        o.orderType,
        o.storeName,
        o.mallName,
        o.orderSourceName,
        o.primaryProductName,
      )) return false
      if (colOrder && !String(o.number ?? '').toLowerCase().includes(colOrder.toLowerCase())) {
        return false
      }
      if (
        colCustomer &&
        !String(o.customerName ?? '').toLowerCase().includes(colCustomer.toLowerCase())
      ) {
        return false
      }
      if (colTotal && !String(o.total ?? '').includes(colTotal)) return false
      if (colStatus && colStatus.length && !colStatus.includes(String(o.status || '').toLowerCase())) {
        return false
      }
      return true
    })
  }, [orders, search, statusFilter, colOrder, colCustomer, colTotal, colStatus])

  const summary = useMemo(
    () => ({
      total: displayData.length,
      pending: displayData.filter((o) => o.status === 'pending').length,
      inProgress: displayData.filter((o) =>
        ['confirmed', 'preparing', 'out_for_delivery'].includes(o.status),
      ).length,
      delivered: displayData.filter((o) => o.status === 'delivered').length,
    }),
    [displayData],
  )

  const displayTotal = displayData.length

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, colOrder, colCustomer, colTotal, colStatus])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayTotal, pageSize, page])

  const fallbackStatusOptions = useMemo(
    () =>
      ORDER_STATUSES.map((s) => ({
        value: s,
        label: t(`orders.status.${s}`),
      })),
    [t],
  )

  const columns = useMemo(
    () => [
      {
        title: t('orders.colOrder'),
        dataIndex: 'number',
        key: 'number',
        align: 'left',
        filteredValue: colOrder ? [colOrder] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('orders.filterOrder')}
            value={colOrder}
            onApply={setColOrder}
            onReset={() => setColOrder('')}
            confirm={confirm}
          />
        ),
        render: (value, record) => (
          <span className="font-medium text-slate-900 inline-flex items-center gap-2 flex-wrap group-hover:text-[#FF7D29]">
            {value}
            {record.isExternal ? <ExternalOrderTag /> : null}
            {record.isMock ? (
              <Tag color="orange" bordered={false} className="!m-0 !text-[10px]">
                {t('orders.mockBadge')}
              </Tag>
            ) : null}
          </span>
        ),
      },
      {
        title: t('orders.colOrderType'),
        dataIndex: 'orderType',
        key: 'orderType',
        align: 'left',
        ellipsis: true,
        render: (_, record) => {
          const sourceName = record.orderSourceName || record.mallName || record.storeName
          return (
            <span className="inline-flex items-center gap-2 flex-wrap text-slate-700">
              <Tag color={record.orderType === 'mall' ? 'purple' : undefined} className="!m-0">
                {orderTypeLabel(record, t)}
              </Tag>
              {sourceName ? <span>{sourceName}</span> : null}
            </span>
          )
        },
      },
      {
        title: t('orders.colProduct'),
        dataIndex: 'primaryProductName',
        key: 'primaryProductName',
        align: 'left',
        ellipsis: true,
        render: (value, record) => (
          <ExternalOrderProductCell name={value} isExternal={record.isExternal} />
        ),
      },
      {
        title: t('orders.colImage'),
        dataIndex: 'productImageUrl',
        key: 'productImageUrl',
        width: 64,
        align: 'center',
        render: (value) =>
          value ? (
            <img
              src={value}
              alt=""
              className="h-10 w-10 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
              —
            </span>
          ),
      },
      {
        title: t('orders.colCustomer'),
        dataIndex: 'customerName',
        key: 'customerName',
        align: 'left',
        filteredValue: colCustomer ? [colCustomer] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('orders.filterCustomer')}
            value={colCustomer}
            onApply={setColCustomer}
            onReset={() => setColCustomer('')}
            confirm={confirm}
          />
        ),
        render: (value) => <span className="text-slate-700">{value}</span>,
      },
      {
        title: t('orders.colTotal'),
        dataIndex: 'total',
        key: 'total',
        align: 'left',
        filteredValue: colTotal ? [colTotal] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('orders.filterTotal')}
            value={colTotal}
            onApply={setColTotal}
            onReset={() => setColTotal('')}
            confirm={confirm}
          />
        ),
        render: (value) => (
          <span className="tabular-nums text-slate-900">{Number(value).toFixed(2)}</span>
        ),
      },
      {
        title: t('orders.colCoupon'),
        key: 'coupon',
        align: 'left',
        width: 160,
        render: (_, record) => {
          if (record.progressiveCouponCode) {
            return (
              <Tag color="purple" title={t('orders.detail.progressiveCoupon')}>
                {record.progressiveCouponCode}
                {record.progressiveTierApplied != null
                  ? ` · ${t('orders.detail.progressiveTier')} ${record.progressiveTierApplied}`
                  : ''}
              </Tag>
            )
          }
          if (record.couponCode) {
            return <Tag color="blue">{record.couponCode}</Tag>
          }
          return <span className="text-slate-400">{t('shared.emDash')}</span>
        },
      },
      {
        title: t('orders.driver'),
        key: 'driver',
        width: 280,
        align: 'left',
        render: (_, record) => {
          const idKey = String(record.id)
          const saved = getEffectiveDriverId(record, getDriverId)
          const pending = pendingDriverEdits[idKey]
          const selectValue =
            pending !== undefined ? (pending === null ? undefined : pending) : (saved ?? undefined)
          const dirty =
            pending !== undefined && String(pending ?? '') !== String(saved ?? '')
          const statusLower = String(record.status || '').toLowerCase()
          const isPendingStatus = statusLower === 'pending'
          const orderNum = Number(record.id)
          const validApiOrderId = Number.isInteger(orderNum) && orderNum > 0
          const showAccept = isPendingStatus && !record.isMock && validApiOrderId
          const showCancel =
            isAdmin &&
            !record.isMock &&
            validApiOrderId &&
            canAdminCancelOrder(statusLower)
          const canAssignDriver =
            ASSIGN_DRIVER_STATUSES.has(statusLower) && validApiOrderId && !record.isMock
          const effectiveDriverId = saved
          const showDriverReadOnly =
            Boolean(effectiveDriverId) && DRIVER_ASSIGNED_READONLY_STATUSES.has(statusLower)
          const showAssignControls = canAssignDriver && !showDriverReadOnly
          const selectPlaceholder = t('orders.assignDriver')
          const selectNode = (
            <Select
              size="small"
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={selectPlaceholder}
              allowClear
              disabled={!showAssignControls}
              loading={isAdmin && driversLoading}
              value={selectValue}
              onChange={(v) => {
                setPendingDriverEdits((prev) => ({
                  ...prev,
                  [idKey]: v === undefined ? null : String(v),
                }))
              }}
              options={driverOptions}
            />
          )
          const drvDisplay =
            effectiveDriverId != null
              ? resolveAssignedDriverDisplay(effectiveDriverId, apiDrivers)
              : null
          return (
            <div
              className="flex flex-col items-stretch gap-1 min-w-[200px] max-w-[280px]"
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              {showAccept ? (
                <AntButton
                  size="small"
                  type="primary"
                  block
                  loading={acceptingOrderId === idKey}
                  onClick={() => void handleAcceptOrder(record)}
                >
                  {t('orders.acceptOrder')}
                </AntButton>
              ) : null}
              {showCancel ? (
                <Popconfirm
                  title={t('orders.cancelConfirmTitle')}
                  description={t('orders.cancelConfirmDesc', {
                    order: String(record.number ?? record.id),
                  })}
                  okText={t('orders.cancelOrder')}
                  okButtonProps={{ danger: true }}
                  cancelText={t('shared.cancel')}
                  onConfirm={() => handleCancelOrder(record)}
                >
                  <AntButton
                    size="small"
                    danger
                    block
                    loading={cancellingOrderId === idKey}
                    disabled={acceptingOrderId === idKey}
                  >
                    {t('orders.cancelOrder')}
                  </AntButton>
                </Popconfirm>
              ) : null}
              {showDriverReadOnly && drvDisplay ? (
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{drvDisplay.name}</p>
                  <p className="text-xs text-slate-600 tabular-nums mt-0.5">{drvDisplay.phone}</p>
                </div>
              ) : showAssignControls ? (
                selectNode
              ) : (
                <Tooltip
                  title={
                    !validApiOrderId || record.isMock
                      ? t('orders.assignDemoLocal')
                      : t('orders.assignNotAllowedStatus')
                  }
                >
                  <span className="block w-full">
                    <Select
                      size="small"
                      showSearch
                      optionFilterProp="label"
                      className="w-full"
                      placeholder={t('orders.assignDriver')}
                      disabled
                      options={driverOptions}
                    />
                  </span>
                </Tooltip>
              )}
              {dirty && showAssignControls ? (
                <AntButton
                  size="small"
                  type="primary"
                  block
                  loading={assigningOrderId === idKey}
                  onClick={() => void handleApplyDriver(record)}
                >
                  {t('shared.apply')}
                </AntButton>
              ) : null}
            </div>
          )
        },
      },
      {
        title: t('orders.colStatus'),
        dataIndex: 'status',
        key: 'status',
        align: 'left',
        filteredValue: colStatus && colStatus.length ? colStatus : null,
        filterDropdown: ({ confirm }) => (
          <StatusColumnFilter
            options={statusOptions.length ? statusOptions : fallbackStatusOptions}
            value={colStatus}
            onApply={setColStatus}
            confirm={confirm}
            t={t}
          />
        ),
        render: (status) => {
          const s = String(status || '').replace(/_/g, ' ')
          const key = String(status || '').toLowerCase()
          const label =
            ORDER_STATUSES.includes(key) ? t(`orders.status.${key}`) : s || t('shared.emDash')
          switch (status) {
            case 'pending':
              return (
                <Tag color="gold" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {label}
                </Tag>
              )
            case 'confirmed':
              return (
                <Tag color="blue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {label}
                </Tag>
              )
            case 'preparing':
              return (
                <Tag color="geekblue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {label}
                </Tag>
              )
            case 'out_for_delivery':
              return (
                <Tag color="cyan" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {label}
                </Tag>
              )
            case 'delivered':
              return (
                <Tag color="green" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {label}
                </Tag>
              )
            case 'cancelled':
              return (
                <Tag color="red" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {label}
                </Tag>
              )
            default:
              return (
                <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {label}
                </Tag>
              )
          }
        },
      },
    ],
    [
      t,
      colOrder,
      colCustomer,
      colTotal,
      colStatus,
      statusOptions,
      fallbackStatusOptions,
      getDriverId,
      apiDrivers,
      pendingDriverEdits,
      driverOptions,
      isAdmin,
      driversLoading,
      assigningOrderId,
      acceptingOrderId,
      handleApplyDriver,
      handleAcceptOrder,
      handleCancelOrder,
      cancellingOrderId,
    ],
  )

  const listTitle =
    displayTotal !== orders.length
      ? t('orders.cardTitle', {
          suffix: t('shared.shownOfTotal', { shown: displayTotal, total: orders.length }),
        })
      : t('orders.cardTitle', { suffix: t('shared.count', { count: displayTotal }) })

  const mobilePageData = displayData.slice((page - 1) * pageSize, page * pageSize)

  function renderOrderColumn(columnKey, record) {
    const column = columns.find((candidate) => candidate.key === columnKey)
    if (!column) return t('shared.emDash')
    const value = column.dataIndex ? record[column.dataIndex] : undefined
    return typeof column.render === 'function' ? column.render(value, record) : value
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="warning"
          title={t('orders.loadErrorTitle')}
          description={
            <Trans
              ns="pages"
              i18nKey="orders.loadErrorDesc"
              values={{ error: String(error) }}
              components={{
                code: <code className="text-xs" />,
                docs: (
                  <a
                    href="https://test.taswouk.com/api/docs"
                    className="text-[#FF7D29]"
                    target="_blank"
                    rel="noreferrer"
                  />
                ),
              }}
            />
          }
          showIcon
          action={
            <Button type="link" size="small" onClick={() => fetchOrders()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card title={t('orders.totalFiltered')}>
          <p className="text-2xl font-semibold text-slate-900">
            {summary.total.toLocaleString()}
          </p>
        </Card>
        <Card title={t('orders.pending')}>
          <p className="text-2xl font-semibold text-amber-600">
            {summary.pending.toLocaleString()}
          </p>
        </Card>
        <Card title={t('orders.inProgress')}>
          <p className="text-2xl font-semibold text-[#FF7D29]">
            {summary.inProgress.toLocaleString()}
          </p>
        </Card>
        <Card title={t('orders.delivered')}>
          <p className="text-2xl font-semibold text-emerald-600">
            {summary.delivered.toLocaleString()}
          </p>
        </Card>
      </div>

      <Card title={listTitle}>
        <Spin spinning={loading}>
          <p className="hidden text-xs text-slate-500 mb-3 md:block">
            {t('orders.expandHint')} {t('orders.clickRowHint')}
          </p>
          <p className="text-xs text-slate-500 mb-3 md:hidden">
            {t('orders.mobileHint')}
          </p>
          <DashboardTableToolbar
            searchPlaceholder={t('orders.searchPlaceholder')}
            searchValue={search}
            onSearchChange={setSearch}
            filterSlot={
              <Select
                mode="multiple"
                allowClear
                placeholder={t('orders.filterByStatus')}
                value={statusFilter}
                onChange={setStatusFilter}
                className="min-w-[200px] max-w-full"
                options={statusOptions.length ? statusOptions : fallbackStatusOptions}
              />
            }
          />
          <div className="hidden md:block">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={displayData}
              scroll={DASHBOARD_TABLE_PROPS.scroll}
              onRow={(record) => ({
                onClick: (e) => {
                  const el = /** @type {HTMLElement} */ (e.target)
                  if (el.closest('.ant-table-row-expand-icon, button, .ant-select, a')) return
                  openOrderDetail(record)
                },
                className: 'cursor-pointer hover:bg-slate-50/80',
              })}
              expandable={{
                expandedRowRender: (record) => {
                  const drvId = getEffectiveDriverId(record, getDriverId)
                  const drv = drvId ? resolveAssignedDriverDisplay(drvId, apiDrivers) : null
                  return (
                    <div className="space-y-3 max-w-4xl">
                      {record.isExternal ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span>
                            <span className="text-slate-500">{t('orders.colStore')}: </span>
                            <span className="font-medium text-slate-800">
                              {record.storeName || t('shared.emDash')}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500">{t('orders.colProduct')}: </span>
                            <ExternalOrderProductCell
                              name={record.primaryProductName}
                              isExternal={record.isExternal}
                            />
                          </span>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-slate-500">{t('orders.assignedTo')}</span>
                        {drv ? (
                          <span className="font-medium text-slate-800">
                            {drv.name}
                            <span className="text-slate-400 font-normal text-xs ms-2 tabular-nums">
                              {drv.phone}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">{t('orders.unassigned')}</span>
                        )}
                      </div>
                      <OrderFulfillmentStepper status={record.status} />
                    </div>
                  )
                },
              }}
              pagination={buildDashboardPagination({
                page,
                pageSize,
                total: displayTotal,
                showTotal: (total) => t('orders.pagination', { count: total }),
                onChange: (p, ps) => {
                  setPage(p)
                  setPageSize(ps)
                },
              })}
              size={DASHBOARD_TABLE_PROPS.size}
            />
          </div>

          <div className="space-y-3 md:hidden">
            {mobilePageData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              mobilePageData.map((record) => (
                <article
                  key={record.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-1 bg-gradient-to-r from-[#FF7D29] via-orange-300 to-amber-200" />
                  <div className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="shrink-0">{renderOrderColumn('productImageUrl', record)}</div>
                        <div className="min-w-0 space-y-1">
                          {renderOrderColumn('number', record)}
                          <div className="truncate text-sm text-slate-600">
                            {renderOrderColumn('primaryProductName', record)}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">{renderOrderColumn('status', record)}</div>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-100 py-3 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{t('orders.colOrderType')}</dt>
                        <dd className="mt-1 truncate font-medium text-slate-800">
                          {renderOrderColumn('orderType', record)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{t('orders.colCustomer')}</dt>
                        <dd className="mt-1 truncate font-medium text-slate-800">
                          {renderOrderColumn('customerName', record)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{t('orders.colTotal')}</dt>
                        <dd className="mt-1 font-semibold text-slate-900">
                          {renderOrderColumn('total', record)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{t('orders.colCoupon')}</dt>
                        <dd className="mt-1 truncate">{renderOrderColumn('coupon', record)}</dd>
                      </div>
                    </dl>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500">{t('orders.driver')}</p>
                      {renderOrderColumn('driver', record)}
                    </div>

                    <AntButton type="primary" block onClick={() => openOrderDetail(record)}>
                      {t('orders.viewDetails')}
                    </AntButton>
                  </div>
                </article>
              ))
            )}

            {displayTotal > pageSize ? (
              <div className="flex justify-center pt-2">
                <Pagination
                  simple
                  responsive
                  current={page}
                  pageSize={pageSize}
                  total={displayTotal}
                  showSizeChanger={false}
                  onChange={setPage}
                />
              </div>
            ) : null}
          </div>
        </Spin>
      </Card>

      <OrderDetailModal
        open={Boolean(detailOrder)}
        orderId={detailOrder?.id ?? null}
        previewRecord={detailOrder?.record ?? null}
        deliveryUserId={detailOrder?.deliveryUserId ?? null}
        driverName={detailOrder?.driverName ?? null}
        onClose={() => setDetailOrder(null)}
      />
    </div>
  )
}
