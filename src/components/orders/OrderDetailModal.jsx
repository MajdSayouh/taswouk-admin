// Modal: full order details + delivery / driver map.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal, Descriptions, Table, Tag, Spin, Alert, Button, Popconfirm, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import {
  getOrderById,
  getDeliveryAssignments,
  removeOrderItems,
  updateOrderStatus,
} from '../../services/orderService.js'
import { queryClient } from '../../query/queryClient.js'
import { listAdminUsersByRole } from '../../services/adminService.js'
import { deliveryUserDisplayName } from '../../viewmodels/useDriversViewModel.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useAuthStore, isAdminRole } from '../../store/authStore.js'
import { normalizeOrderDetail, extractDriverLocation, coordsFromLatLng } from '../../utils/orderDetail.js'
import { buildOrderItemProductUrl } from '../../utils/publicSiteLinks.js'
import { ProductTableThumbnail } from '../products/ProductTableThumbnail.jsx'
import { OrderTrackingMap } from '../maps/OrderTrackingMap.jsx'
import { AssignmentRouteMap } from '../maps/AssignmentRouteMap.jsx'
import { OrderFulfillmentStepper } from './OrderFulfillmentStepper.jsx'
import { ExternalOrderTag } from './ExternalOrderTag.jsx'
import { ExternalOrderProductCell } from './ExternalOrderProductCell.jsx'

function buildMockDetailPayload(record) {
  return {
    id: record?.id ?? 'mock',
    store_name: 'Demo Store',
    customer_name: record?.customerName ?? 'Demo Customer',
    customer_phone: record?.customerPhone ?? '+963 900 000 000',
    status: record?.status ?? 'preparing',
    subtotal: Number(record?.total ?? 0),
    discount_amount: 0,
    discount_percent: 0,
    total: Number(record?.total ?? 0),
    address_text: 'Demo address — Homs',
    latitude: 34.732,
    longitude: 36.714,
    driver_latitude: 34.728,
    driver_longitude: 36.708,
    delivery_user_id: record?.deliveryUserId ?? 'drv-1',
    items: [
      {
        product_name: 'Demo product',
        product_price: Number(record?.total ?? 0),
        quantity: 1,
        line_total: Number(record?.total ?? 0),
      },
    ],
    created_at: record?.createdAt ?? new Date().toISOString(),
    isMock: true,
  }
}

// A line can come off an order until it is delivered — the backend's rule too.
const ITEM_REMOVABLE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'out_for_delivery'])

function errorDetail(err) {
  return err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
}

function normalizeUserDirectory(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.users)) return data.users
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.items)) return data.items
  return []
}

function phoneFromUser(user) {
  if (!user || typeof user !== 'object') return ''
  return String(
    user.phone ??
      user.phone_number ??
      user.mobile ??
      user.profile?.phone ??
      user.profile?.phone_number ??
      '',
  ).trim()
}

/**
 * @param {{
 *   open: boolean
 *   orderId: string | null
 *   previewRecord?: Record<string, unknown> | null
 *   deliveryUserId?: string | null
 *   driverName?: string | null
 *   onClose: () => void
 * }} props
 */
export function OrderDetailModal({
  open,
  orderId,
  previewRecord = null,
  deliveryUserId,
  driverName,
  onClose,
}) {
  const { t } = useTranslation('pages')
  const user = useAuthStore((state) => state.user)
  const isAdmin = Boolean(user && isAdminRole(user.role))
  const [selectedItemKeys, setSelectedItemKeys] = useState([])
  const [removing, setRemoving] = useState(false)

  const isMockPreview = Boolean(previewRecord?.isMock)
  const numericId = orderId != null ? Number(orderId) : NaN
  const canFetch = open && !isMockPreview && Number.isInteger(numericId) && numericId > 0

  const previewOrderType = previewRecord?.orderType ?? previewRecord?.order_type ?? undefined

  const detailQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderId, previewOrderType),
    queryFn: async () => {
      const raw = await getOrderById(numericId, previewOrderType)
      return normalizeOrderDetail(raw)
    },
    enabled: canFetch,
  })

  const assignmentQuery = useQuery({
    queryKey: [...queryKeys.orders.all(), 'assignment', orderId, previewOrderType ?? ''],
    queryFn: async () => {
      const list = await getDeliveryAssignments()
      const rows = Array.isArray(list) ? list : []
      // Store and mall order ids are separate sequences, so the same id can name two
      // orders — match the kind too when it is known.
      const kind = previewOrderType === 'mall' ? 'mall' : previewOrderType === 'store' ? 'store' : null
      return (
        rows.find(
          (row) =>
            String(row?.order_id ?? row?.orderId) === String(orderId) &&
            (!kind || !row?.order_kind || row.order_kind === kind),
        ) ?? null
      )
    },
    enabled: canFetch,
    refetchInterval: open ? 15_000 : false,
  })

  const mockDetail = useMemo(() => {
    if (!isMockPreview || !open) return null
    return normalizeOrderDetail(buildMockDetailPayload(previewRecord))
  }, [isMockPreview, open, previewRecord])

  const detail = isMockPreview ? mockDetail : detailQuery.data
  const assignment = assignmentQuery.data
  // The route endpoint is admin-only; everyone else keeps the destination-only map.
  const routeAssignmentId =
    user && isAdminRole(user.role) && assignment?.assignment_id != null ? assignment.assignment_id : null
  const previewCustomerPhone = String(previewRecord?.customerPhone ?? '').trim()
  const knownCustomerPhone = detail?.customerPhone || previewCustomerPhone

  const customerDirectoryQuery = useQuery({
    queryKey: queryKeys.adminUsers.byRole('CUSTOMER'),
    queryFn: ({ signal }) => listAdminUsersByRole('CUSTOMER', { signal }),
    enabled:
      open &&
      !isMockPreview &&
      Boolean(user && isAdminRole(user.role)) &&
      !knownCustomerPhone &&
      detail?.customerId != null,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const customerPhone = useMemo(() => {
    if (knownCustomerPhone) return knownCustomerPhone
    const customerId = detail?.customerId
    if (customerId == null) return ''
    const customer = normalizeUserDirectory(customerDirectoryQuery.data).find(
      (candidate) => String(candidate?.id ?? candidate?.user_id ?? candidate?.pk ?? '') === String(customerId),
    )
    return phoneFromUser(customer)
  }, [knownCustomerPhone, detail?.customerId, customerDirectoryQuery.data])

  const effectiveDriverId =
    detail?.deliveryUserId ?? deliveryUserId ?? (assignment?.delivery_user_id != null ? String(assignment.delivery_user_id) : null)

  // Fall back to resolving the driver's name ourselves (instead of relying solely on the
  // `driverName` prop, which the orders list only fills in when its own driver directory
  // happens to already be loaded) so the detail view doesn't fall back to "Driver #{id}".
  const driverDirectoryQuery = useQuery({
    queryKey: queryKeys.adminUsers.byRole('DELIVERY'),
    queryFn: ({ signal }) => listAdminUsersByRole('DELIVERY', { signal }),
    enabled:
      open &&
      !isMockPreview &&
      Boolean(user && isAdminRole(user.role)) &&
      !driverName &&
      effectiveDriverId != null,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const resolvedDriverName = useMemo(() => {
    if (driverName) return driverName
    if (effectiveDriverId == null) return null
    const driver = normalizeUserDirectory(driverDirectoryQuery.data).find(
      (candidate) => String(candidate?.id ?? candidate?.user_id ?? candidate?.pk ?? '') === String(effectiveDriverId),
    )
    return driver ? deliveryUserDisplayName(driver) : null
  }, [driverName, effectiveDriverId, driverDirectoryQuery.data])

  const driverLocation = useMemo(() => {
    if (detail?.driverLocation) return detail.driverLocation
    if (assignment) {
      const fromAssignment = extractDriverLocation(assignment)
      if (fromAssignment) return fromAssignment
    }
    return null
  }, [detail?.driverLocation, assignment])

  const destination = useMemo(() => {
    if (detail?.destination) return detail.destination
    if (assignment) return coordsFromLatLng(assignment)
    return null
  }, [detail?.destination, assignment])

  // Which lines the admin may take off: a store line (it has its own id) whose
  // store part has not been delivered or cancelled yet.
  const removableItemKeys = useMemo(() => {
    if (!isAdmin || isMockPreview || !detail) return new Set()
    const storeParts = new Map(
      (detail.parts ?? [])
        .filter((part) => part.orderType === 'store' && part.orderId != null)
        .map((part) => [String(part.orderId), part]),
    )
    return new Set(
      detail.items
        .filter((item) => {
          if (item.itemId == null || item.orderId == null) return false
          const status = storeParts.get(String(item.orderId))?.status ?? detail.status
          return ITEM_REMOVABLE_STATUSES.has(status)
        })
        .map((item) => item.key),
    )
  }, [isAdmin, isMockPreview, detail])

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })

  // Selected lines may span several stores, and each store is its own row on the
  // backend — so one request per store.
  const handleRemoveItems = async (items) => {
    const byOrder = new Map()
    for (const item of items) {
      const key = String(item.orderId)
      byOrder.set(key, [...(byOrder.get(key) ?? []), Number(item.itemId)])
    }
    setRemoving(true)
    try {
      for (const [orderKey, itemIds] of byOrder) {
        await removeOrderItems(Number(orderKey), itemIds)
      }
      message.success(t('orders.detail.removeItemsSuccess', { count: items.length }))
      setSelectedItemKeys([])
    } catch (err) {
      const detailText = errorDetail(err)
      message.error(
        detailText ? `${t('orders.detail.removeItemsError')} ${detailText}` : t('orders.detail.removeItemsError'),
      )
    } finally {
      await refreshOrders()
      setRemoving(false)
    }
  }

  // Drops one store from a split cart: its part is cancelled (stock, coupon and
  // wallet returned) and the other stores carry on. Works for legacy mall parts
  // too, which have no line ids to remove one by one.
  const handleRemovePart = async (part) => {
    setRemoving(true)
    try {
      await updateOrderStatus(Number(part.orderId), 'cancelled', part.orderType)
      message.success(t('orders.detail.removeStoreSuccess', { store: part.sellerName }))
      setSelectedItemKeys([])
    } catch (err) {
      const detailText = errorDetail(err)
      message.error(
        detailText ? `${t('orders.detail.removeStoreError')} ${detailText}` : t('orders.detail.removeStoreError'),
      )
    } finally {
      await refreshOrders()
      setRemoving(false)
    }
  }

  // Taking off every remaining line of a single-store order cancels it — say so.
  const removeConfirmTitle = (count) =>
    count >= removableItemKeys.size && (detail?.parts?.length ?? 0) <= 1
      ? t('orders.detail.removeAllItemsConfirm')
      : t('orders.detail.removeItemsConfirm', { count })

  const statusLabel = detail?.status
    ? t(`orders.status.${detail.status}`, { defaultValue: detail.status })
    : '—'

  const itemColumns = useMemo(
    () => [
      {
        title: t('orders.detail.colProduct'),
        dataIndex: 'productName',
        key: 'productName',
        render: (value, row) => {
          // Internal product first; external-store items (no product_id) fall back to the
          // direct link the backend gives us to the item on the external site.
          const productUrl =
            buildOrderItemProductUrl({
              orderType: detail?.orderType,
              mallId: detail?.mallId,
              productId: row.productId,
            }) || row.productExternalUrl || ''
          const thumbnail = row.productImageUrl ? (
            <ProductTableThumbnail
              storagePath={row.productImageUrl}
              productId={row.productId}
              size={44}
            />
          ) : (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
              —
            </span>
          )
          const content = (
            <>
              {thumbnail}
              <ExternalOrderProductCell
                name={value}
                isExternal={Boolean(detail?.isExternal)}
              />
            </>
          )
          return productUrl ? (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('orders.detail.openProduct', { name: value })}
              className="flex min-w-[190px] items-center gap-3 rounded transition-colors hover:text-[#FF7D29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D29]"
            >
              {content}
            </a>
          ) : (
            <div className="flex min-w-[190px] items-center gap-3">{content}</div>
          )
        },
      },
      {
        title: t('orders.detail.colQty'),
        dataIndex: 'quantity',
        key: 'quantity',
        width: 72,
        align: 'center',
      },
      {
        title: t('orders.detail.colPrice'),
        dataIndex: 'productPrice',
        key: 'productPrice',
        width: 100,
        render: (v) => <span className="tabular-nums">{Number(v).toFixed(2)}</span>,
      },
      {
        title: t('orders.detail.colLineTotal'),
        dataIndex: 'lineTotal',
        key: 'lineTotal',
        width: 110,
        render: (v) => <span className="tabular-nums font-medium">{Number(v).toFixed(2)}</span>,
      },
      ...(removableItemKeys.size > 0
        ? [
            {
              title: '',
              key: 'actions',
              width: 56,
              align: 'center',
              render: (_value, row) =>
                removableItemKeys.has(row.key) ? (
                  <Popconfirm
                    title={removeConfirmTitle(1)}
                    description={t('orders.detail.removeItemsDesc')}
                    okText={t('orders.detail.removeItems')}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleRemoveItems([row])}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      disabled={removing}
                      aria-label={t('orders.detail.removeItemAria', { name: row.productName })}
                    />
                  </Popconfirm>
                ) : null,
            },
          ]
        : []),
    ],
    // The handlers are recreated each render but only read state already listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, detail?.isExternal, detail?.orderType, detail?.mallId, removableItemKeys, removing],
  )

  const selectedItems = (detail?.items ?? []).filter(
    (item) => selectedItemKeys.includes(item.key) && removableItemKeys.has(item.key),
  )

  const mapLegend = (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600 mb-2">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow" />
        {t('orders.detail.legendDestination')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-orange-600 border border-white shadow" />
        {t('orders.detail.legendDriver')}
      </span>
    </div>
  )

  return (
    <Modal
      title={
        detail ? (
          <span className="inline-flex items-center gap-2 flex-wrap">
            {t('orders.detail.title', { order: detail.number })}
            {detail.isExternal ? <ExternalOrderTag /> : null}
          </span>
        ) : (
          t('orders.detail.titleLoading')
        )
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnClose
      styles={{ body: { maxHeight: 'min(78vh, 720px)', overflowY: 'auto' } }}
    >
      {!isMockPreview && detailQuery.isLoading ? (
        <div className="py-12 flex justify-center">
          <Spin />
        </div>
      ) : (!isMockPreview && detailQuery.isError) || !detail ? (
        <Alert type="error" showIcon message={t('orders.detail.loadError')} />
      ) : (
        <div className="space-y-5">
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label={t('orders.detail.store')}>
              <span className="inline-flex items-center gap-2 flex-wrap">
                <Tag color={detail.orderType === 'mall' ? 'purple' : undefined} className="!m-0">
                  {detail.orderType === 'mall'
                    ? t('orders.orderTypes.mall')
                    : detail.isExternal
                      ? t('orders.orderTypes.external')
                      : detail.orderType === 'store'
                        ? t('orders.orderTypes.store')
                        : detail.orderType || t('shared.emDash')}
                </Tag>
                {detail.orderSourceName || t('shared.emDash')}
                {detail.isExternal ? <ExternalOrderTag /> : null}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.detail.customer')}>{detail.customerName}</Descriptions.Item>
            <Descriptions.Item label={t('orders.detail.customerPhone')}>
              {customerPhone ? (
                <span className="select-text" dir="ltr">
                  {customerPhone}
                </span>
              ) : customerDirectoryQuery.isFetching ? (
                <Spin size="small" />
              ) : (
                t('shared.emDash')
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.detail.status')}>
              <Tag>{statusLabel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.detail.created')}>
              {detail.createdAt
                ? new Date(detail.createdAt).toLocaleString()
                : t('shared.emDash')}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.detail.address')} span={2}>
              {detail.addressText}
            </Descriptions.Item>
            {Array.isArray(detail.parts) && detail.parts.length > 1 ? (
              // One basket, several sellers: the lines below are all of them
              // together, so say who owns what and where each one has reached.
              // Accepting the order accepts every part at once.
              <Descriptions.Item label={t('orders.detail.sellers')} span={2}>
                <span className="flex flex-wrap items-center gap-2">
                  {detail.parts.map((part) => (
                    <Tag key={part.orderId ?? part.sellerName} className="!m-0 inline-flex items-center gap-1">
                      {part.sellerName || t('shared.emDash')} ·{' '}
                      {part.total.toFixed(2)} SYP ·{' '}
                      {t(`orders.status.${part.status}`, { defaultValue: part.status })}
                      {isAdmin && !isMockPreview && part.orderId != null && ITEM_REMOVABLE_STATUSES.has(part.status) ? (
                        <Popconfirm
                          title={t('orders.detail.removeStoreConfirm', { store: part.sellerName })}
                          description={t('orders.detail.removeStoreDesc')}
                          okText={t('orders.detail.removeStore')}
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleRemovePart(part)}
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            disabled={removing}
                            aria-label={t('orders.detail.removeStoreAria', { store: part.sellerName })}
                          />
                        </Popconfirm>
                      ) : null}
                    </Tag>
                  ))}
                </span>
              </Descriptions.Item>
            ) : null}
            <Descriptions.Item label={t('orders.detail.subtotal')}>
              {detail.subtotal.toFixed(2)} SYP
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.detail.discount')}>
              {detail.discountAmount > 0 || detail.couponCode ? (
                <>
                  {detail.discountAmount.toFixed(2)} SYP
                  {detail.discountPercent > 0 ? ` (${detail.discountPercent}%)` : ''}
                  {detail.couponCode ? (
                    <Tag color="blue" className="ms-1.5">
                      {t('orders.detail.coupon')}: {detail.couponCode}
                    </Tag>
                  ) : null}
                </>
              ) : (
                t('orders.detail.noDiscount')
              )}
            </Descriptions.Item>
            {detail.progressiveCouponCode ? (
              <Descriptions.Item label={t('orders.detail.progressiveCoupon')} span={2}>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Tag color="purple">{detail.progressiveCouponCode}</Tag>
                  {detail.progressiveTierApplied != null ? (
                    <span className="text-slate-700">
                      {t('orders.detail.progressiveTier')}: {detail.progressiveTierApplied}
                    </span>
                  ) : null}
                  <span className="text-slate-700">
                    {t('orders.detail.progressiveDiscount')}:{' '}
                    <span className="font-medium">
                      {detail.progressiveDiscountApplied.toFixed(2)} SYP
                    </span>
                  </span>
                </span>
              </Descriptions.Item>
            ) : null}
            <Descriptions.Item label={t('orders.detail.total')} span={2}>
              <span className="font-semibold text-slate-900">{detail.total.toFixed(2)} SYP</span>
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.driver')} span={2}>
              {effectiveDriverId ? (
                resolvedDriverName ? (
                  resolvedDriverName
                ) : driverDirectoryQuery.isFetching ? (
                  <Spin size="small" />
                ) : (
                  t('orders.driverOrphan', { id: effectiveDriverId })
                )
              ) : (
                t('orders.unassigned')
              )}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">{t('orders.detail.fulfillment')}</h4>
            <OrderFulfillmentStepper status={detail.status} />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-slate-800">{t('orders.detail.items')}</h4>
              {selectedItems.length > 0 ? (
                <Popconfirm
                  title={removeConfirmTitle(selectedItems.length)}
                  description={t('orders.detail.removeItemsDesc')}
                  okText={t('orders.detail.removeItems')}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleRemoveItems(selectedItems)}
                >
                  <Button danger size="small" icon={<DeleteOutlined />} loading={removing}>
                    {t('orders.detail.removeSelected', { count: selectedItems.length })}
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              dataSource={detail.items}
              columns={itemColumns}
              rowSelection={
                removableItemKeys.size > 0
                  ? {
                      selectedRowKeys: selectedItemKeys,
                      onChange: (keys) => setSelectedItemKeys(keys),
                      getCheckboxProps: (row) => ({ disabled: !removableItemKeys.has(row.key) || removing }),
                    }
                  : undefined
              }
              expandable={
                detail.items.some((i) => i.variantSku || i.variantAttributes)
                  ? {
                      expandedRowRender: (row) => (
                        <div className="text-xs text-slate-600 space-y-1">
                          {row.variantSku ? (
                            <p>
                              {t('orders.detail.sku')}: {row.variantSku}
                            </p>
                          ) : null}
                          {row.variantAttributes ? <p>{row.variantAttributes}</p> : null}
                        </div>
                      ),
                      rowExpandable: (row) => Boolean(row.variantSku || row.variantAttributes),
                    }
                  : undefined
              }
            />
          </div>

          {routeAssignmentId != null ? (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">{t('orders.detail.mapTitle')}</h4>
              <AssignmentRouteMap assignmentId={routeAssignmentId} enabled={open} height={300} />
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">{t('orders.detail.mapTitle')}</h4>
              {mapLegend}
              <OrderTrackingMap
                destination={destination}
                driver={driverLocation}
                destinationLabel={t('orders.detail.legendDestination')}
                driverLabel={t('orders.detail.legendDriver')}
                height={300}
              />
              {!destination && !driverLocation ? (
                <p className="text-xs text-slate-500 mt-2">{t('orders.detail.noCoordinates')}</p>
              ) : null}
              {effectiveDriverId && !driverLocation ? (
                <p className="text-xs text-amber-700 mt-2">{t('orders.detail.driverLocationUnavailable')}</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
