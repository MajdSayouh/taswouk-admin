// View: progressive coupons list — GET /api/orders/progressive-coupons/admin/coupons
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, Space, Spin, Switch, Table, Tag, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import {
  useProgressiveCouponsViewModel,
  useProgressiveCouponStats,
} from '../../viewmodels/useProgressiveCouponsViewModel.js'

const DEFAULT_PAGE_SIZE = 10

function ProgressiveCouponActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.couponId) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync({ couponId: row.id, payload: { is_active: next } })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('progressiveCoupons.list.activeUpdateErr'))
        }
      }}
    />
  )
}

function ProgressiveCouponStatsModal({ couponId, code, onClose, t }) {
  const statsQuery = useProgressiveCouponStats(couponId, { enabled: couponId != null })
  const rows = statsQuery.data ?? []

  const columns = [
    {
      title: t('progressiveCoupons.stats.colPhone'),
      dataIndex: 'userPhone',
      key: 'userPhone',
    },
    {
      title: t('progressiveCoupons.stats.colTier'),
      dataIndex: 'currentTier',
      key: 'currentTier',
      width: 100,
      align: 'center',
    },
    {
      title: t('progressiveCoupons.stats.colUsed'),
      dataIndex: 'usedCount',
      key: 'usedCount',
      width: 100,
      align: 'center',
    },
    {
      title: t('progressiveCoupons.stats.colExpired'),
      dataIndex: 'isExpired',
      key: 'isExpired',
      width: 120,
      render: (v) =>
        v ? (
          <Tag color="red">{t('progressiveCoupons.stats.expired')}</Tag>
        ) : (
          <Tag color="green">{t('progressiveCoupons.stats.valid')}</Tag>
        ),
    },
  ]

  return (
    <Modal
      title={t('progressiveCoupons.stats.title', { code })}
      open={couponId != null}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      {statsQuery.isLoading ? (
        <div className="py-8 flex justify-center">
          <Spin />
        </div>
      ) : statsQuery.isError ? (
        <Alert type="error" showIcon message={t('progressiveCoupons.stats.loadError')} />
      ) : (
        <Table
          size="small"
          rowKey={(r) => r.userPhone}
          columns={columns}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: t('progressiveCoupons.stats.empty') }}
        />
      )}
    </Modal>
  )
}

export function ProgressiveCouponsListPage() {
  const { t } = useTranslation('pages')
  const { progressiveCoupons, loading, error, refetch, updateStatusMutation } =
    useProgressiveCouponsViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [colCode, setColCode] = useState('')
  /** @type {string[] | null} */
  const [colActive, setColActive] = useState(null)
  const [statsCouponId, setStatsCouponId] = useState(/** @type {string | null} */ (null))
  const [statsCouponCode, setStatsCouponCode] = useState('')

  const displayData = useMemo(() => {
    return progressiveCoupons.filter((row) => {
      if (!rowMatchesSearch(search, row.code, row.id)) return false
      if (colActive && colActive.length) {
        const y = colActive.includes('yes')
        const n = colActive.includes('no')
        if (y && !n && !row.isActive) return false
        if (n && !y && row.isActive) return false
      }
      if (colCode && !String(row.code ?? '').toLowerCase().includes(colCode.toLowerCase())) {
        return false
      }
      return true
    })
  }, [progressiveCoupons, search, colActive, colCode])

  const displayTotal = displayData.length

  useEffect(() => {
    setPage(1)
  }, [search, colCode, colActive])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayTotal, pageSize, page])

  const titleSuffix =
    displayTotal !== progressiveCoupons.length
      ? t('shared.shownOfTotal', { shown: displayTotal, total: progressiveCoupons.length })
      : t('shared.count', { count: displayTotal })

  const columns = useMemo(
    () => [
      {
        title: t('progressiveCoupons.list.colCode'),
        key: 'code',
        align: 'left',
        filteredValue: colCode ? [colCode] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('progressiveCoupons.list.filterCode')}
            value={colCode}
            onApply={setColCode}
            onReset={() => setColCode('')}
            confirm={confirm}
          />
        ),
        render: (_, row) => <span className="font-mono text-slate-900">{row.code}</span>,
      },
      {
        title: t('progressiveCoupons.list.colActivations'),
        dataIndex: 'totalActivations',
        key: 'totalActivations',
        width: 140,
        render: (v) => <span className="tabular-nums text-slate-700">{v}</span>,
      },
      {
        title: t('shared.status'),
        key: 'active',
        width: 120,
        align: 'left',
        filteredValue: colActive && colActive.length ? colActive : null,
        filterDropdown: ({ confirm }) => (
          <TriStateYesNoColumnFilter
            value={colActive}
            onApply={setColActive}
            confirm={confirm}
            placeholder={t('progressiveCoupons.list.filterStatus')}
          />
        ),
        render: (_, row) => (
          <ProgressiveCouponActiveSwitch row={row} mutation={updateStatusMutation} t={t} />
        ),
      },
      {
        title: t('shared.actions'),
        key: 'actions',
        width: 160,
        align: 'left',
        fixed: 'right',
        render: (_, row) => (
          <Button
            type="button"
            variant="ghost"
            className="!px-2.5 !py-1.5 !h-8 min-h-8 text-sm font-medium"
            onClick={() => {
              setStatsCouponId(row.id)
              setStatsCouponCode(row.code)
            }}
          >
            {t('progressiveCoupons.list.viewStats')}
          </Button>
        ),
      },
    ],
    [t, colCode, colActive, updateStatusMutation],
  )

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title={t('progressiveCoupons.list.loadError')}
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}

      <Card
        title={t('progressiveCoupons.list.title', { suffix: titleSuffix })}
        actions={
          <Space wrap size="middle">
            <DashboardAddLinkButton to="/progressive-coupons/create">
              {t('progressiveCoupons.list.newCoupon')}
            </DashboardAddLinkButton>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('progressiveCoupons.list.searchPlaceholder')}
            searchValue={search}
            onSearchChange={setSearch}
          />
          <Table
            rowKey="id"
            columns={columns}
            dataSource={displayData}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total: displayTotal,
              showTotal: (total) => t('progressiveCoupons.list.pagination', { count: total }),
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>

      {statsCouponId != null ? (
        <ProgressiveCouponStatsModal
          couponId={statsCouponId}
          code={statsCouponCode}
          onClose={() => setStatsCouponId(null)}
          t={t}
        />
      ) : null}
    </div>
  )
}
