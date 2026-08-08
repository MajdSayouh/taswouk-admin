// Admin: GET /api/external-shops/ — list, toggle active, delete external shops.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Tag, Alert, Spin, Switch, message } from 'antd'
import { useExternalShopsViewModel } from '../../viewmodels/useExternalShopsViewModel.js'
import { buildExternalShopActivePayload } from '../../models/ExternalShop.js'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { Card } from '../../components/ui/Card.jsx'

const DEFAULT_PAGE_SIZE = 10

function matchesTriBool(/** @type {string[] | null} */ col, /** @type {boolean} */ v) {
  if (!col || !col.length) return true
  const y = col.includes('yes')
  const n = col.includes('no')
  if (y && !n) return v === true
  if (n && !y) return v === false
  return true
}

function ExternalShopActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables?.shopId != null &&
    String(mutation.variables.shopId) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync({
            shopId: row.id,
            payload: buildExternalShopActivePayload(row, next),
          })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('externalShops.list.activeUpdateErr'))
        }
      }}
    />
  )
}

export function ExternalShopsListPage() {
  const { t } = useTranslation('pages')
  const { shops, loading, error, refetch, deleteShop, updateMutation } = useExternalShopsViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [colName, setColName] = useState('')
  const [colBaseUrl, setColBaseUrl] = useState('')
  /** @type {string[] | null} */
  const [colActive, setColActive] = useState(null)
  /** @type {string[] | null} */
  const [colVpn, setColVpn] = useState(null)

  const displayData = useMemo(() => {
    return shops.filter((row) => {
      if (!rowMatchesSearch(search, row.name, row.id, row.baseUrl)) return false
      if (!matchesTriBool(colActive, row.isActive)) return false
      if (!matchesTriBool(colVpn, row.requiresVpn)) return false
      if (colName && !String(row.name ?? '').toLowerCase().includes(colName.toLowerCase())) {
        return false
      }
      if (colBaseUrl && !String(row.baseUrl ?? '').toLowerCase().includes(colBaseUrl.toLowerCase())) {
        return false
      }
      return true
    })
  }, [shops, search, colActive, colVpn, colName, colBaseUrl])

  useEffect(() => {
    setPage(1)
  }, [search, colActive, colVpn, colName, colBaseUrl])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayData.length / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayData.length, pageSize, page])

  async function confirmDelete(id) {
    setDeletingId(id)
    try {
      await deleteShop(id)
      message.success(t('externalShops.list.deleted'))
    } catch (err) {
      message.error(err?.message ?? t('externalShops.list.deleteErr'))
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    { title: t('externalShops.list.colId'), dataIndex: 'id', width: 72 },
    {
      title: t('externalShops.list.colLogo'),
      key: 'logo',
      width: 72,
      render: (_, row) =>
        row.logoUrl ? (
          <img
            src={resolvePublicMediaUrl(row.logoUrl)}
            alt=""
            className="h-10 w-10 rounded object-cover border border-slate-200"
          />
        ) : (
          '—'
        ),
    },
    {
      title: t('externalShops.list.colName'),
      dataIndex: 'name',
      ellipsis: true,
      filteredValue: colName ? [colName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('externalShops.list.filterName')}
          value={colName}
          onApply={setColName}
          onReset={() => setColName('')}
          confirm={confirm}
        />
      ),
    },
    {
      title: t('externalShops.list.colBaseUrl'),
      dataIndex: 'baseUrl',
      ellipsis: true,
      filteredValue: colBaseUrl ? [colBaseUrl] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('externalShops.list.filterBaseUrl')}
          value={colBaseUrl}
          onApply={setColBaseUrl}
          onReset={() => setColBaseUrl('')}
          confirm={confirm}
        />
      ),
      render: (value) =>
        value ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-[#FF7D29] hover:underline">
            {value}
          </a>
        ) : (
          '—'
        ),
    },
    {
      title: t('externalShops.list.colVpn'),
      key: 'vpn',
      width: 100,
      filteredValue: colVpn && colVpn.length ? colVpn : null,
      filterDropdown: ({ confirm }) => (
        <TriStateYesNoColumnFilter
          value={colVpn}
          onApply={setColVpn}
          confirm={confirm}
          placeholder={t('externalShops.list.colVpn')}
        />
      ),
      render: (_, row) =>
        row.requiresVpn ? (
          <Tag color="orange">{t('shared.yes')}</Tag>
        ) : (
          <Tag>{t('shared.no')}</Tag>
        ),
    },
    {
      title: t('shared.status'),
      key: 'active',
      width: 100,
      filteredValue: colActive && colActive.length ? colActive : null,
      filterDropdown: ({ confirm }) => (
        <TriStateYesNoColumnFilter
          value={colActive}
          onApply={setColActive}
          confirm={confirm}
          placeholder={t('shared.status')}
        />
      ),
      render: (_, row) => (
        <ExternalShopActiveSwitch row={row} mutation={updateMutation} t={t} />
      ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 168,
      fixed: 'right',
      render: (_, row) => (
        <TableRowActions
          editTo={`/external-shops/${row.id}/edit`}
          onDelete={() => confirmDelete(row.id)}
          deleteTitle={t('externalShops.list.deleteTitle')}
          deleteDescription={t('externalShops.list.deleteDesc')}
          deleteLoading={deletingId === row.id}
        />
      ),
    },
  ]

  const titleSuffix =
    displayData.length !== shops.length
      ? t('shared.shownOfTotal', { shown: displayData.length, total: shops.length })
      : t('shared.count', { count: displayData.length })

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          showIcon
          message={t('externalShops.list.loadError')}
          description={error}
          action={
            <button type="button" className="text-sm font-medium text-[#FF7D29]" onClick={() => refetch()}>
              {t('shared.retry')}
            </button>
          }
        />
      ) : null}

      <Card
        title={t('externalShops.list.title', { suffix: titleSuffix })}
        actions={
          <DashboardAddLinkButton to="/external-shops/create">
            {t('externalShops.list.new')}
          </DashboardAddLinkButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('externalShops.list.searchPh')}
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
              total: displayData.length,
              showTotal: (total) => t('externalShops.list.pagination', { count: total }),
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
