// Admin: GET /api/malls/ — list, toggle active, delete malls.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Tag, Alert, Spin, Switch, message } from 'antd'
import { useMallsViewModel } from '../../viewmodels/useMallsViewModel.js'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import { Card } from '../../components/ui/Card.jsx'

const DEFAULT_PAGE_SIZE = 10

function MallActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async () => {
        const prev = checked
        setChecked(!prev)
        try {
          await mutation.mutateAsync(row.id)
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('malls.list.activeUpdateErr'))
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

export function MallsListPage() {
  const { t } = useTranslation('pages')
  const { malls, loading, error, refetch, deleteMall, toggleActiveMutation } = useMallsViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [colName, setColName] = useState('')
  const [colPhone, setColPhone] = useState('')
  /** @type {string[] | null} */
  const [colActive, setColActive] = useState(null)

  const displayData = useMemo(() => {
    return malls.filter((row) => {
      if (!rowMatchesSearch(search, row.name, row.id, row.phone, row.address, row.contactEmail)) {
        return false
      }
      if (!matchesTriBool(colActive, row.isActive)) return false
      if (colName && !String(row.name ?? '').toLowerCase().includes(colName.toLowerCase())) {
        return false
      }
      if (colPhone && !String(row.phone ?? '').toLowerCase().includes(colPhone.toLowerCase())) {
        return false
      }
      return true
    })
  }, [malls, search, colActive, colName, colPhone])

  const columns = [
    { title: t('malls.list.colId'), dataIndex: 'id', width: 72 },
    {
      title: t('malls.list.colName'),
      dataIndex: 'name',
      filterDropdown: ColumnTextFilterDropdown({
        value: colName,
        onChange: setColName,
        placeholder: t('shared.textFilter'),
      }),
      filteredValue: colName ? [colName] : null,
    },
    {
      title: t('malls.list.colHours'),
      key: 'hours',
      render: (_, row) =>
        row.startWorkingAt && row.endWorkingAt
          ? `${row.startWorkingAt} – ${row.endWorkingAt}`
          : '—',
    },
    {
      title: t('malls.list.colPhone'),
      dataIndex: 'phone',
      ellipsis: true,
      filteredValue: colPhone ? [colPhone] : null,
      filterDropdown: ColumnTextFilterDropdown({
        value: colPhone,
        onChange: setColPhone,
        placeholder: t('shared.textFilter'),
      }),
    },
    { title: t('malls.list.colAddress'), dataIndex: 'address', ellipsis: true },
    {
      title: t('malls.list.colMinOrder'),
      dataIndex: 'minimumOrder',
      width: 100,
    },
    {
      title: t('malls.list.colPriceMatch'),
      dataIndex: 'priceMatch',
      width: 100,
      render: (v) =>
        v ? (
          <Tag color="orange">{t('shared.yes')}</Tag>
        ) : (
          <Tag>{t('shared.no')}</Tag>
        ),
    },
    {
      title: t('malls.list.colRate'),
      dataIndex: 'rate',
      width: 72,
      render: (v) => (v != null ? Number(v).toFixed(1) : '—'),
    },
    {
      title: t('malls.list.colExchangeRate'),
      dataIndex: 'exchangeRate',
      width: 130,
      render: (value) =>
        value == null ? t('malls.list.systemExchangeRate') : Number(value).toLocaleString(),
    },
    {
      title: t('shared.status'),
      key: 'active',
      width: 100,
      filterDropdown: TriStateYesNoColumnFilter({
        value: colActive,
        onChange: setColActive,
        yesLabel: t('shared.active'),
        noLabel: t('shared.inactive'),
      }),
      filteredValue: colActive,
      render: (_, row) => <MallActiveSwitch row={row} mutation={toggleActiveMutation} t={t} />,
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, row) => (
        <TableRowActions
          editTo={`/malls/${row.id}/edit`}
          showDelete
          deleteLoading={deletingId === row.id}
          onDelete={async () => {
            setDeletingId(row.id)
            try {
              await deleteMall(row.id)
              message.success(t('malls.list.deleted'))
            } catch (e) {
              message.error(e?.message ?? t('malls.list.deleteErr'))
            } finally {
              setDeletingId(null)
            }
          }}
          deleteTitle={t('malls.list.deleteTitle')}
          deleteDescription={t('malls.list.deleteDesc')}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card
        title={t('malls.list.title', { suffix: '' })}
        actions={
          <DashboardAddLinkButton to="/malls/create">
            {t('malls.list.new')}
          </DashboardAddLinkButton>
        }
      >
        {error ? (
          <Alert type="error" showIcon message={error} className="mb-4" action={<button type="button" onClick={() => refetch()}>{t('shared.retry')}</button>} />
        ) : null}
        <DashboardTableToolbar search={search} onSearchChange={setSearch} placeholder={t('malls.list.searchPh')} />
        <Spin spinning={loading}>
          <Table
            {...DASHBOARD_TABLE_PROPS}
            rowKey="id"
            dataSource={displayData}
            columns={columns}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total: displayData.length,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
              t,
            })}
          />
        </Spin>
      </Card>
    </div>
  )
}
