// View: coupons list — GET /api/orders/coupons
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Descriptions, Input, Modal, Space, Spin, Switch, Table, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import { useCouponsViewModel } from '../../viewmodels/useCouponsViewModel.js'
import { mapCouponFromApi } from '../../models/Coupon.js'

const DEFAULT_PAGE_SIZE = 10

function CouponActiveSwitch({ row, mutation, t }) {
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
          message.error(e?.message ?? t('coupons.list.activeUpdateErr'))
        }
      }}
    />
  )
}

function formatDateTime(iso, locale) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  try {
    return d.toLocaleString(locale)
  } catch {
    return d.toISOString()
  }
}

function matchesColActiveFilter(/** @type {string[] | null} */ col, /** @type {boolean} */ isActive) {
  if (!col || !col.length) return true
  const y = col.includes('yes')
  const n = col.includes('no')
  if (y && !n) return isActive
  if (n && !y) return !isActive
  return true
}

export function CouponsListPage() {
  const { t, i18n } = useTranslation('pages')
  const {
    coupons,
    loading,
    error,
    refetch,
    deleteMutation,
    updateMutation,
    validateMutation,
  } = useCouponsViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [colCode, setColCode] = useState('')
  const [colName, setColName] = useState('')
  const [colDiscount, setColDiscount] = useState('')
  const [colUses, setColUses] = useState('')
  const [colExpires, setColExpires] = useState('')
  const [colCreated, setColCreated] = useState('')
  /** @type {string[] | null} */
  const [colActive, setColActive] = useState(null)

  const [validateOpen, setValidateOpen] = useState(false)
  const [validateCode, setValidateCode] = useState('')
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))

  const displayData = useMemo(() => {
    return coupons.filter((row) => {
      if (!rowMatchesSearch(search, row.code, row.name, row.id)) return false
      if (!matchesColActiveFilter(colActive, row.isActive)) return false
      if (colCode && !String(row.code ?? '').toLowerCase().includes(colCode.toLowerCase())) {
        return false
      }
      if (colName && !String(row.name ?? '').toLowerCase().includes(colName.toLowerCase())) {
        return false
      }
      if (
        colDiscount &&
        !String(row.discountPercent ?? '').toLowerCase().includes(colDiscount.toLowerCase())
      ) {
        return false
      }
      const usesStr = `${row.usesCount} / ${row.maxUses != null ? row.maxUses : t('coupons.list.unlimitedMax')}`
      if (colUses && !usesStr.toLowerCase().includes(colUses.toLowerCase())) return false
      if (colExpires) {
        const exp = row.expiresAt
          ? `${formatDateTime(row.expiresAt, i18n.language)} ${row.expiresAt}`.toLowerCase()
          : '—'
        if (!exp.includes(colExpires.toLowerCase())) return false
      }
      if (colCreated) {
        const cr = row.createdAt
          ? `${formatDateTime(row.createdAt, i18n.language)} ${row.createdAt}`.toLowerCase()
          : ''
        if (!cr.includes(colCreated.toLowerCase())) return false
      }
      return true
    })
  }, [coupons, search, colActive, colCode, colName, colDiscount, colUses, colExpires, colCreated, t, i18n.language])

  const displayTotal = displayData.length

  useEffect(() => {
    setPage(1)
  }, [search, colCode, colName, colDiscount, colUses, colExpires, colCreated, colActive])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [displayTotal, pageSize, page])

  const titleSuffix =
    displayTotal !== coupons.length
      ? t('shared.shownOfTotal', { shown: displayTotal, total: coupons.length })
      : t('shared.count', { count: displayTotal })

  const handleDelete = useCallback(
    async (row) => {
      setDeletingId(String(row.id))
      try {
        await deleteMutation.mutateAsync(row.id)
        message.success(t('coupons.list.deleted'))
      } catch (e) {
        message.error(e?.message ?? t('shared.deleteFailed'))
      } finally {
        setDeletingId(null)
      }
    },
    [deleteMutation, t],
  )

  async function handleValidateSubmit() {
    const code = String(validateCode ?? '').trim()
    if (code.length < 2) {
      message.warning(t('coupons.validate.codeShort'))
      return
    }
    try {
      const raw = await validateMutation.mutateAsync({ code })
      const mapped = mapCouponFromApi(raw)
      Modal.success({
        title: t('coupons.validate.okTitle'),
        content: (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t('coupons.list.colCode')}>{mapped.code}</Descriptions.Item>
            <Descriptions.Item label={t('coupons.list.colName')}>{mapped.name}</Descriptions.Item>
            <Descriptions.Item label={t('coupons.list.colDiscount')}>
              {mapped.discountPercent}%
            </Descriptions.Item>
          </Descriptions>
        ),
      })
      setValidateOpen(false)
      setValidateCode('')
    } catch (e) {
      message.error(e?.message ?? t('coupons.validate.failed'))
    }
  }

  const columns = useMemo(
    () => [
      {
        title: t('coupons.list.colCode'),
        key: 'code',
        align: 'left',
        filteredValue: colCode ? [colCode] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('coupons.list.filterCode')}
            value={colCode}
            onApply={setColCode}
            onReset={() => setColCode('')}
            confirm={confirm}
          />
        ),
        render: (_, row) => <span className="font-mono text-slate-900">{row.code}</span>,
      },
      {
        title: t('coupons.list.colName'),
        key: 'name',
        align: 'left',
        filteredValue: colName ? [colName] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('coupons.list.filterName')}
            value={colName}
            onApply={setColName}
            onReset={() => setColName('')}
            confirm={confirm}
          />
        ),
        render: (_, row) => <span className="text-slate-800">{row.name}</span>,
      },
      {
        title: t('coupons.list.colDiscount'),
        key: 'discount',
        width: 110,
        align: 'left',
        filteredValue: colDiscount ? [colDiscount] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('coupons.list.filterDiscount')}
            value={colDiscount}
            onApply={setColDiscount}
            onReset={() => setColDiscount('')}
            confirm={confirm}
          />
        ),
        render: (_, row) => <span className="tabular-nums">{row.discountPercent}%</span>,
      },
      {
        title: t('coupons.list.colUses'),
        key: 'uses',
        width: 120,
        align: 'left',
        filteredValue: colUses ? [colUses] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('coupons.list.filterUses')}
            value={colUses}
            onApply={setColUses}
            onReset={() => setColUses('')}
            confirm={confirm}
          />
        ),
        render: (_, row) => (
          <span className="tabular-nums text-slate-700">
            {row.usesCount} / {row.maxUses != null ? row.maxUses : t('coupons.list.unlimitedMax')}
          </span>
        ),
      },
      {
        title: t('coupons.list.colExpires'),
        key: 'expires',
        width: 200,
        align: 'left',
        filteredValue: colExpires ? [colExpires] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('coupons.list.filterExpires')}
            value={colExpires}
            onApply={setColExpires}
            onReset={() => setColExpires('')}
            confirm={confirm}
          />
        ),
        render: (_, row) => (
          <span className="text-sm text-slate-600">
            {formatDateTime(row.expiresAt, i18n.language)}
          </span>
        ),
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
            placeholder={t('coupons.list.filterStatus')}
          />
        ),
        render: (_, row) => (
          <CouponActiveSwitch row={row} mutation={updateMutation} t={t} />
        ),
      },
      {
        title: t('coupons.list.colCreated'),
        key: 'created',
        width: 180,
        align: 'left',
        filteredValue: colCreated ? [colCreated] : null,
        filterDropdown: ({ confirm }) => (
          <ColumnTextFilterDropdown
            placeholder={t('coupons.list.filterCreated')}
            value={colCreated}
            onApply={setColCreated}
            onReset={() => setColCreated('')}
            confirm={confirm}
          />
        ),
        render: (_, row) => (
          <span className="text-sm text-slate-600">
            {formatDateTime(row.createdAt, i18n.language)}
          </span>
        ),
      },
      {
        title: t('shared.actions'),
        key: 'actions',
        width: 168,
        align: 'left',
        fixed: 'right',
        render: (_, row) => (
          <TableRowActions
            editTo={`/coupons/${row.id}/edit`}
            onDelete={() => handleDelete(row)}
            deleteTitle={t('coupons.list.deleteTitle')}
            deleteDescription={t('coupons.list.deleteDesc')}
            deleteLoading={deletingId === String(row.id)}
          />
        ),
      },
    ],
    [
      t,
      i18n.language,
      colCode,
      colName,
      colDiscount,
      colUses,
      colExpires,
      colCreated,
      colActive,
      deletingId,
      handleDelete,
      updateMutation,
    ],
  )

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title={t('coupons.list.loadError')}
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
        title={t('coupons.list.title', { suffix: titleSuffix })}
        actions={
          <Space wrap size="middle">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setValidateOpen(true)}
              className="inline-flex min-h-9 items-center justify-center px-4 font-medium whitespace-nowrap"
            >
              {t('coupons.list.validateAction')}
            </Button>
            <DashboardAddLinkButton to="/coupons/create">
              {t('coupons.list.newCoupon')}
            </DashboardAddLinkButton>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('coupons.list.searchPlaceholder')}
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
              showTotal: (total) => t('coupons.list.pagination', { count: total }),
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>

      <Modal
        title={t('coupons.validate.title')}
        open={validateOpen}
        onCancel={() => {
          setValidateOpen(false)
          setValidateCode('')
        }}
        onOk={handleValidateSubmit}
        okText={t('coupons.validate.submit')}
        confirmLoading={validateMutation.isPending}
        destroyOnHidden
      >
        <p className="text-sm text-slate-600 mb-2">{t('coupons.validate.hint')}</p>
        <Input
          value={validateCode}
          onChange={(e) => setValidateCode(e.target.value)}
          placeholder={t('coupons.validate.placeholder')}
          maxLength={50}
        />
      </Modal>
    </div>
  )
}
