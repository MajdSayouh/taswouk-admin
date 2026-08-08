// Admin: GET /api/accounts/admin/users/sellers — list, edit, delete sellers.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Tag, Alert, Spin, Switch, message } from 'antd'
import { useSellersViewModel } from '../../viewmodels/useSellersViewModel.js'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const DEFAULT_PAGE_SIZE = 10

function SellerActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.sellerId) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync({ sellerId: row.id, payload: { is_active: next } })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('sellers.list.activeUpdateErr'))
        }
      }}
    />
  )
}

function matchesTriBool(/** @type {string[] | null} */ col, /** @type {boolean} */ v) {
  if (!col || !col.length) return true
  const y = col.includes('yes')
  const n = col.includes('no')
  if (y && !n) return v === true
  if (n && !y) return v === false
  return true
}

export function SellersListPage() {
  const { t } = useTranslation('pages')
  const { sellers, loading, error, refetch, deleteSeller, updateSellerMutation } =
    useSellersViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))

  const [colIdentity, setColIdentity] = useState('')
  const [colName, setColName] = useState('')
  const [colPhone, setColPhone] = useState('')
  const [colRole, setColRole] = useState('')
  /** @type {string[] | null} */
  const [colActive, setColActive] = useState(null)
  /** @type {string[] | null} */
  const [colVerified, setColVerified] = useState(null)

  const displayData = useMemo(() => {
    return sellers.filter((row) => {
      if (
        !rowMatchesSearch(
          search,
          row.email,
          row.id,
          row.phone,
          row.firstName,
          row.lastName,
          row.role,
        )
      ) {
        return false
      }
      const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ')
      if (
        colIdentity &&
        !String(row.email ?? '')
          .toLowerCase()
          .includes(colIdentity.toLowerCase()) &&
        !String(row.id ?? '').toLowerCase().includes(colIdentity.toLowerCase())
      ) {
        return false
      }
      if (colName && !fullName.toLowerCase().includes(colName.toLowerCase())) return false
      if (colPhone && !String(row.phone ?? '').toLowerCase().includes(colPhone.toLowerCase())) {
        return false
      }
      if (colRole && !String(row.role ?? '').toLowerCase().includes(colRole.toLowerCase())) {
        return false
      }
      if (!matchesTriBool(colActive, row.isActive)) return false
      if (!matchesTriBool(colVerified, row.isVerified)) return false
      return true
    })
  }, [sellers, search, colIdentity, colName, colPhone, colRole, colActive, colVerified])

  const displayTotal = displayData.length

  useEffect(() => {
    setPage(1)
  }, [search, colIdentity, colName, colPhone, colRole, colActive, colVerified])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayTotal, pageSize, page])

  async function handleDelete(sellerId) {
    setDeletingId(String(sellerId))
    try {
      await deleteSeller(sellerId)
      message.success(t('sellers.list.deleted'))
    } catch (err) {
      message.error(err?.message ?? t('sellers.list.deleteErr'))
    } finally {
      setDeletingId(null)
    }
  }

  const titleSuffix =
    displayTotal !== sellers.length
      ? t('shared.shownOfTotal', { shown: displayTotal, total: sellers.length })
      : t('shared.count', { count: displayTotal })

  const em = t('shared.emDash')

  const columns = [
    {
      title: t('sellers.list.colSeller'),
      key: 'identity',
      align: 'left',
      filteredValue: colIdentity ? [colIdentity] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('sellers.list.filterEmail')}
          value={colIdentity}
          onApply={setColIdentity}
          onReset={() => setColIdentity('')}
          confirm={confirm}
        />
      ),
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-900">{row.email || em}</p>
          <p className="text-xs text-slate-500 tabular-nums">
            {t('categories.idLine', { id: row.id })}
          </p>
        </div>
      ),
    },
    {
      title: t('sellers.list.colName'),
      key: 'name',
      align: 'left',
      filteredValue: colName ? [colName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('sellers.list.filterName')}
          value={colName}
          onApply={setColName}
          onReset={() => setColName('')}
          confirm={confirm}
        />
      ),
      render: (_, row) => (
        <span className="text-slate-700">
          {[row.firstName, row.lastName].filter(Boolean).join(' ') || em}
        </span>
      ),
    },
    {
      title: t('sellers.list.colPhone'),
      dataIndex: 'phone',
      key: 'phone',
      align: 'left',
      width: 120,
      filteredValue: colPhone ? [colPhone] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('sellers.list.filterPhone')}
          value={colPhone}
          onApply={setColPhone}
          onReset={() => setColPhone('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="tabular-nums text-slate-700">{v || em}</span>,
    },
    {
      title: t('sellers.list.colRole'),
      dataIndex: 'role',
      key: 'role',
      align: 'left',
      width: 100,
      filteredValue: colRole ? [colRole] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('sellers.list.filterRole')}
          value={colRole}
          onApply={setColRole}
          onReset={() => setColRole('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-600 text-sm">{v || em}</span>,
    },
    {
      title: t('sellers.list.colActive'),
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'left',
      width: 110,
      filteredValue: colActive && colActive.length ? colActive : null,
      filterDropdown: ({ confirm }) => (
        <TriStateYesNoColumnFilter
          value={colActive}
          onApply={setColActive}
          confirm={confirm}
          placeholder={t('sellers.list.colActive')}
        />
      ),
      render: (_, row) => (
        <SellerActiveSwitch row={row} mutation={updateSellerMutation} t={t} />
      ),
    },
    {
      title: t('sellers.list.colVerified'),
      dataIndex: 'isVerified',
      key: 'isVerified',
      align: 'left',
      width: 110,
      filteredValue: colVerified && colVerified.length ? colVerified : null,
      filterDropdown: ({ confirm }) => (
        <TriStateYesNoColumnFilter
          value={colVerified}
          onApply={setColVerified}
          confirm={confirm}
          placeholder={t('sellers.list.colVerified')}
        />
      ),
      render: (v) =>
        v ? (
          <Tag color="blue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
            {t('shared.yes')}
          </Tag>
        ) : (
          <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>{t('shared.no')}</Tag>
        ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      align: 'left',
      width: 168,
      fixed: 'right',
      render: (_, row) => (
        <TableRowActions
          editTo={`/sellers/${row.id}/edit`}
          onDelete={() => handleDelete(row.id)}
          deleteTitle={t('sellers.list.deleteTitle')}
          deleteDescription={t('sellers.list.deleteDesc')}
          deleteLoading={deletingId === String(row.id)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title={t('sellers.list.loadError')}
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
        title={t('sellers.list.title', { suffix: titleSuffix })}
        actions={
          <DashboardAddLinkButton to="/sellers/create">{t('sellers.list.new')}</DashboardAddLinkButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('sellers.list.search')}
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
              showTotal: (total) => t('sellers.list.pagination', { count: total }),
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>
    </div>
  )
}
