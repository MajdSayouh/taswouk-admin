// Drivers — GET /api/accounts/admin/users/role/DELIVERY (accounts with DELIVERY role).
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Tag, Alert, Spin } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS, DEFAULT_PAGE_SIZE } from '../../components/tables/tableDefaults.js'
import { useDriversViewModel } from '../../viewmodels/useDriversViewModel.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'

function matchesTriBool(/** @type {string[] | null} */ col, /** @type {boolean} */ active) {
  if (!col || !col.length) return true
  const y = col.includes('yes')
  const n = col.includes('no')
  if (y && !n) return active === true
  if (n && !y) return active === false
  return true
}

export function DriversListPage() {
  const { t } = useTranslation('pages')
  const { drivers, loading, error, refetch } = useDriversViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [colName, setColName] = useState('')
  const [colPhone, setColPhone] = useState('')
  const [colVehicle, setColVehicle] = useState('')
  /** @type {string[] | null} */
  const [colActive, setColActive] = useState(null)

  const displayData = useMemo(() => {
    return drivers.filter((row) => {
      if (!rowMatchesSearch(search, row.name, row.phone, row.vehicle, row.id)) return false
      if (colName && !String(row.name ?? '').toLowerCase().includes(colName.toLowerCase())) return false
      if (colPhone && !String(row.phone ?? '').toLowerCase().includes(colPhone.toLowerCase())) return false
      if (colVehicle && !String(row.vehicle ?? '').toLowerCase().includes(colVehicle.toLowerCase())) {
        return false
      }
      if (!matchesTriBool(colActive, row.active)) return false
      return true
    })
  }, [drivers, search, colName, colPhone, colVehicle, colActive])

  const displayTotal = displayData.length
  const totalAll = drivers.length

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination reset on filter change
    setPage(1)
  }, [search, colName, colPhone, colVehicle, colActive])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp when data shrinks
      setPage(maxPage)
    }
  }, [displayTotal, pageSize, page])

  const titleSuffix =
    displayTotal !== totalAll
      ? t('shared.shownOfTotal', { shown: displayTotal, total: totalAll })
      : t('shared.count', { count: displayTotal })

  const columns = [
    {
      title: t('drivers.colName'),
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      filteredValue: colName ? [colName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('drivers.filterName')}
          value={colName}
          onApply={setColName}
          onReset={() => setColName('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="font-medium text-slate-900">{v}</span>,
    },
    {
      title: t('drivers.colPhone'),
      dataIndex: 'phone',
      key: 'phone',
      align: 'left',
      filteredValue: colPhone ? [colPhone] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('drivers.filterPhone')}
          value={colPhone}
          onApply={setColPhone}
          onReset={() => setColPhone('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="tabular-nums text-slate-700">{v}</span>,
    },
    {
      title: t('drivers.colVehicle'),
      dataIndex: 'vehicle',
      key: 'vehicle',
      align: 'left',
      filteredValue: colVehicle ? [colVehicle] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('drivers.filterVehicle')}
          value={colVehicle}
          onApply={setColVehicle}
          onReset={() => setColVehicle('')}
          confirm={confirm}
        />
      ),
    },
    {
      title: t('drivers.colActive'),
      dataIndex: 'active',
      key: 'active',
      width: 120,
      align: 'left',
      filteredValue: colActive && colActive.length ? colActive : null,
      filterDropdown: ({ confirm }) => (
        <TriStateYesNoColumnFilter
          value={colActive}
          onApply={setColActive}
          confirm={confirm}
          placeholder={t('drivers.colActive')}
        />
      ),
      render: (active) =>
        active ? (
          <Tag color="green" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
            {t('shared.active')}
          </Tag>
        ) : (
          <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>{t('drivers.inactive')}</Tag>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      {error ? (
        <Alert
          type="error"
          title={t('drivers.loadError')}
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}

      <p className="text-sm text-slate-600">{t('drivers.subtitle')}</p>
      <Card title={t('drivers.listTitle', { suffix: titleSuffix })}>
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('drivers.searchPlaceholder')}
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
              showTotal: (total) => t('drivers.pagination', { count: total }),
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
