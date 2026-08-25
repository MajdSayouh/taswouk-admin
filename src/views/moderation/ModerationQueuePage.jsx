// View: product moderation queue — GET /api/products/moderation/queue.
// See product-moderation-dashboard-spec.md for the full contract.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Table, Tabs, Tag, Select, Space, Modal, Input, message } from 'antd'
import * as storeService from '../../services/storeService.js'
import { mapStoreFromApi } from '../../models/Store.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useAuthStore } from '../../store/authStore.js'
import { useModerationQueueViewModel } from '../../viewmodels/useProductModerationViewModel.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { ProductTableThumbnail } from '../../components/products/ProductTableThumbnail.jsx'
import { formatRelativeTime } from '../../utils/relativeTime.js'

const STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']

const REJECT_REASON_PRESET_KEYS = [
  'unclearImages',
  'incompleteDescription',
  'unreasonablePrice',
  'inappropriateContent',
  'wrongCategory',
]

function positiveInteger(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

/** Shared reject-reason picker: preset buttons (fill the text field) + a required free-text area. */
function RejectReasonFields({ reason, onReasonChange, t }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {REJECT_REASON_PRESET_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onReasonChange(t(`moderation.reasons.${key}`))}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-[#FF7D29] hover:text-[#FF7D29] transition-colors"
          >
            {t(`moderation.reasons.${key}`)}
          </button>
        ))}
      </div>
      <Input.TextArea
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder={t('moderation.queue.reasonPlaceholder')}
        rows={3}
        autoFocus
      />
    </div>
  )
}

export function ModerationQueuePage() {
  const { t } = useTranslation('pages')
  const token = useAuthStore((s) => s.token)
  const [searchParams, setSearchParams] = useSearchParams()

  const status = STATUS_TABS.includes(searchParams.get('status'))
    ? searchParams.get('status')
    : 'PENDING'
  const page = positiveInteger(searchParams.get('page'), 1)
  const pageSize = positiveInteger(searchParams.get('pageSize'), 20)
  const storeId = searchParams.get('store_id') || null
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  // Debounce search → URL, same pattern as the products list.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  function updateParams(patch) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key)
      else next.set(key, String(value))
    }
    setSearchParams(next)
  }

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: async ({ signal }) => {
      const list = await storeService.listStores({ signal })
      return Array.isArray(list) ? list.map(mapStoreFromApi) : []
    },
    enabled: Boolean(token),
  })

  const vm = useModerationQueueViewModel({ status, storeId, search, page, limit: pageSize })

  // Reset the selection whenever the filters/page change — adjusted during render (not an
  // Effect) per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const filterSignature = `${status}:${storeId}:${search}:${page}:${pageSize}`
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature)
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature)
    setSelectedRowKeys([])
  }

  const [rejectTarget, setRejectTarget] = useState(/** @type {'single'|'bulk'|null} */ (null))
  const [rejectProductId, setRejectProductId] = useState(null)
  const [reason, setReason] = useState('')

  function openReject(productId) {
    setRejectProductId(productId)
    setRejectTarget('single')
    setReason('')
  }

  function openBulkReject() {
    setRejectTarget('bulk')
    setReason('')
  }

  function closeReject() {
    setRejectTarget(null)
    setRejectProductId(null)
    setReason('')
  }

  async function handleApprove(productId) {
    try {
      await vm.approve(productId)
      message.success(t('moderation.queue.approveSuccess'))
    } catch (err) {
      message.error(err?.message ?? t('moderation.queue.approveError'))
    }
  }

  async function handleConfirmReject() {
    if (!reason.trim()) return
    try {
      if (rejectTarget === 'bulk') {
        const result = await vm.bulkReject({ productIds: selectedRowKeys, reason: reason.trim() })
        message.success(
          t('moderation.queue.bulkResult', {
            updated: result?.updated ?? 0,
            skipped: Array.isArray(result?.skipped) ? result.skipped.length : 0,
          }),
        )
        setSelectedRowKeys([])
      } else {
        await vm.reject({ productId: rejectProductId, reason: reason.trim() })
        message.success(t('moderation.queue.rejectSuccess'))
      }
      closeReject()
    } catch (err) {
      message.error(err?.message ?? t('moderation.queue.rejectError'))
    }
  }

  async function handleBulkApprove() {
    try {
      const result = await vm.bulkApprove(selectedRowKeys)
      message.success(
        t('moderation.queue.bulkResult', {
          updated: result?.updated ?? 0,
          skipped: Array.isArray(result?.skipped) ? result.skipped.length : 0,
        }),
      )
      setSelectedRowKeys([])
    } catch (err) {
      message.error(err?.message ?? t('moderation.queue.approveError'))
    }
  }

  function confirmBulkApprove() {
    Modal.confirm({
      title: t('moderation.queue.bulkApproveConfirmTitle', { count: selectedRowKeys.length }),
      okText: t('shared.yes'),
      cancelText: t('shared.no'),
      onOk: handleBulkApprove,
    })
  }

  // Not memoized: it closes over per-render state/handlers (vm.items, handleApprove, openReject)
  // that change every render anyway, so useMemo here wouldn't skip any work.
  const columns = [
    {
      title: t('moderation.queue.colProduct'),
      dataIndex: 'name',
      render: (name, row) => (
        <Link
          to={`/moderation/${row.id}`}
          state={{ queueIds: vm.items.map((item) => item.id) }}
          className="flex min-w-[200px] items-center gap-3 text-slate-900 hover:text-[#FF7D29]"
        >
          <ProductTableThumbnail storagePath={row.images?.[0]} productId={row.id} size={40} />
          <span className="flex items-center gap-2">
            <span className="truncate">{name}</span>
            {row.has_pending_changes ? (
              <Tag color="gold">{t('moderation.queue.pendingEditBadge')}</Tag>
            ) : null}
          </span>
        </Link>
      ),
    },
    {
      title: t('moderation.queue.colStore'),
      dataIndex: 'store_name',
      width: 160,
    },
    {
      title: t('moderation.queue.colPrice'),
      dataIndex: 'price',
      width: 100,
      render: (v) => <span className="tabular-nums">{Number(v ?? 0).toFixed(2)}</span>,
    },
    {
      title: t('moderation.queue.colStatus'),
      dataIndex: 'moderation_status',
      width: 130,
      render: (value, row) => {
        const color = value === 'APPROVED' ? 'green' : value === 'REJECTED' ? 'red' : 'orange'
        return (
          <Space direction="vertical" size={2}>
            <Tag color={color}>{t(`moderation.status.${value}`, { defaultValue: value })}</Tag>
            {row.has_pending_changes ? (
              <span className="text-xs text-amber-600">{t('moderation.queue.pendingEditHint')}</span>
            ) : null}
          </Space>
        )
      },
    },
    {
      title: t('moderation.queue.colWaiting'),
      dataIndex: 'submitted_at',
      width: 110,
      render: (v) => formatRelativeTime(v, t),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space wrap>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleApprove(row.id)}
            disabled={vm.approving || vm.rejecting}
          >
            {t('moderation.queue.approve')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => openReject(row.id)}
            disabled={vm.approving || vm.rejecting}
          >
            {t('moderation.queue.reject')}
          </Button>
          <Button
            as={Link}
            type="button"
            variant="ghost"
            to={`/moderation/${row.id}`}
            state={{ queueIds: vm.items.map((item) => item.id) }}
          >
            {t('moderation.queue.review')}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card title={t('moderation.queue.title')}>
        <Tabs
          activeKey={status}
          onChange={(key) => updateParams({ status: key, page: 1 })}
          items={STATUS_TABS.map((key) => ({
            key,
            label:
              key === 'PENDING'
                ? `${t('moderation.status.tabPending')} (${vm.pendingCount})`
                : t(`moderation.status.tab${key.charAt(0)}${key.slice(1).toLowerCase()}`),
          }))}
        />

        <DashboardTableToolbar
          searchPlaceholder={t('moderation.queue.searchPlaceholder')}
          searchValue={searchInput}
          onSearchChange={(v) => {
            setSearchInput(v)
            updateParams({ page: 1 })
          }}
          filterSlot={
            <Select
              allowClear
              placeholder={t('moderation.queue.storeFilterPlaceholder')}
              className="min-w-[200px]"
              loading={storesQuery.isLoading}
              value={storeId || undefined}
              onChange={(v) => updateParams({ store_id: v, page: 1 })}
              options={(storesQuery.data ?? []).map((s) => ({
                value: String(s.id),
                label: s.name,
              }))}
            />
          }
        />

        {selectedRowKeys.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#FF7D29]/30 bg-[#FF7D29]/5 px-3 py-2">
            <span className="text-sm text-slate-700">
              {t('moderation.queue.selectedCount', { count: selectedRowKeys.length })}
            </span>
            <Button type="button" variant="secondary" onClick={confirmBulkApprove} loading={vm.bulkApproving}>
              {t('moderation.queue.bulkApprove')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={openBulkReject}
              loading={vm.bulkRejecting}
            >
              {t('moderation.queue.bulkReject')}
            </Button>
          </div>
        ) : null}

        <Table
          rowKey="id"
          loading={vm.loading}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={vm.items}
          pagination={buildDashboardPagination({
            page,
            pageSize,
            total: vm.count,
            showTotal: (total) => t('shared.shownOfTotal', { count: vm.items.length, total }),
            onChange: (nextPage, nextPageSize) =>
              updateParams({ page: nextPage, pageSize: nextPageSize }),
          })}
          locale={{ emptyText: t('shared.noData') }}
          {...DASHBOARD_TABLE_PROPS}
        />
      </Card>

      <Modal
        open={rejectTarget != null}
        title={
          rejectTarget === 'bulk'
            ? t('moderation.queue.bulkRejectTitle', { count: selectedRowKeys.length })
            : t('moderation.queue.rejectTitle')
        }
        onCancel={closeReject}
        footer={[
          <Button key="cancel" type="button" variant="ghost" onClick={closeReject}>
            {t('shared.cancel')}
          </Button>,
          <Button
            key="confirm"
            type="button"
            variant="primary"
            disabled={!reason.trim()}
            loading={vm.rejecting || vm.bulkRejecting}
            onClick={handleConfirmReject}
          >
            {t('moderation.queue.reject')}
          </Button>,
        ]}
      >
        <RejectReasonFields reason={reason} onReasonChange={setReason} t={t} />
      </Modal>
    </div>
  )
}
