// View: stores — toolbar + column filter dropdowns, left-aligned.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, Tag, Space, Alert, Spin, Select, Switch, message, Button as AntButton } from 'antd'
import { useStoresViewModel } from '../../viewmodels/useStoresViewModel'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddLinkButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import {
  matchesYesNoTriState,
  rowMatchesSearch,
} from '../../utils/tableFilters.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TruncatedTextCell } from '../../components/tables/TruncatedTextCell.jsx'

const DEFAULT_PAGE_SIZE = 10

function TriStateColumnFilter({ options, value, onApply, confirm }) {
  const { t } = useTranslation('pages')
  const [local, setLocal] = useState(value || [])
  useEffect(() => {
    setLocal(value || [])
  }, [value])
  return (
    <div className="p-2 w-52" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder={t('shared.textFilter')}
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

function StoreActiveSwitch({ row, mutation }) {
  const { t } = useTranslation('pages')
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.storeId) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync({ storeId: row.id, isActive: next })
        } catch (err) {
          setChecked(prev)
          message.error(err?.message ?? t('stores.list.activeUpdateErr'))
        }
      }}
    />
  )
}

function StoreBrandSwitch({ row, mutation }) {
  const { t } = useTranslation('pages')
  const [checked, setChecked] = useState(row.isBrand)
  useEffect(() => {
    setChecked(row.isBrand)
  }, [row.id, row.isBrand])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.storeId) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync({ storeId: row.id, isBrand: next })
        } catch (err) {
          setChecked(prev)
          message.error(err?.message ?? t('stores.list.brandUpdateErr'))
        }
      }}
    />
  )
}

export function StoresListPage({ restaurantMode = false }) {
  const { t } = useTranslation('pages')
  const {
    stores,
    loading,
    error,
    fetchStores,
    deleteStore,
    setStoreActiveMutation,
    setStoreBrandMutation,
  } = useStoresViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(/** @type {'all' | 'yes' | 'no'} */ ('all'))
  const [brandFilter, setBrandFilter] = useState(/** @type {'all' | 'yes' | 'no'} */ ('all'))
  const [deletingId, setDeletingId] = useState(null)

  const [colOwnerId, setColOwnerId] = useState('')
  const [colOwnerEmail, setColOwnerEmail] = useState('')
  const [colPhone, setColPhone] = useState('')
  const [colAddress, setColAddress] = useState('')
  const [colDesc, setColDesc] = useState('')
  const [colStoreName, setColStoreName] = useState('')
  /** @type {string[] | null} */
  const [colActive, setColActive] = useState(null)
  /** @type {string[] | null} */
  const [colBrand, setColBrand] = useState(null)

  const scopedStores = useMemo(
    () => (restaurantMode ? stores.filter((row) => row.storeType === 'restaurant') : stores),
    [stores, restaurantMode],
  )

  const displayData = useMemo(() => {
    return scopedStores.filter((row) => {
      if (!matchesYesNoTriState(activeFilter, row.isActive)) return false
      if (!matchesYesNoTriState(brandFilter, row.isBrand)) return false
      if (
        !rowMatchesSearch(
          search,
          row.name,
          row.id,
          row.ownerId,
          row.ownerEmail,
          row.phone,
          row.address,
          row.description,
          row.startWorkingAt,
          row.endWorkingAt,
          row.preparationTime,
        )
      ) {
        return false
      }
      if (colStoreName && !String(row.name ?? '').toLowerCase().includes(colStoreName.toLowerCase())) {
        return false
      }
      if (colOwnerId && !String(row.ownerId ?? '').toLowerCase().includes(colOwnerId.toLowerCase())) {
        return false
      }
      if (
        colOwnerEmail &&
        !String(row.ownerEmail ?? '').toLowerCase().includes(colOwnerEmail.toLowerCase())
      ) {
        return false
      }
      if (colPhone && !String(row.phone ?? '').toLowerCase().includes(colPhone.toLowerCase())) {
        return false
      }
      if (colAddress && !String(row.address ?? '').toLowerCase().includes(colAddress.toLowerCase())) {
        return false
      }
      if (colDesc && !String(row.description ?? '').toLowerCase().includes(colDesc.toLowerCase())) {
        return false
      }
      if (colActive && colActive.length) {
        const y = colActive.includes('yes')
        const n = colActive.includes('no')
        if (y && !n && !row.isActive) return false
        if (n && !y && row.isActive) return false
      }
      if (colBrand && colBrand.length) {
        const y = colBrand.includes('yes')
        const n = colBrand.includes('no')
        if (y && !n && !row.isBrand) return false
        if (n && !y && row.isBrand) return false
      }
      return true
    })
  }, [
    scopedStores,
    search,
    activeFilter,
    brandFilter,
    colStoreName,
    colOwnerId,
    colOwnerEmail,
    colPhone,
    colAddress,
    colDesc,
    colActive,
    colBrand,
  ])

  const displayTotal = displayData.length

  useEffect(() => {
    setPage(1)
  }, [
    search,
    activeFilter,
    brandFilter,
    colStoreName,
    colOwnerId,
    colOwnerEmail,
    colPhone,
    colAddress,
    colDesc,
    colActive,
    colBrand,
  ])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayTotal, pageSize, page])

  const titleSuffix =
    displayTotal !== scopedStores.length
      ? t('shared.shownOfTotal', { shown: displayTotal, total: scopedStores.length })
      : t('shared.count', { count: displayTotal })

  const columns = [
    {
      title: t('stores.list.colStore'),
      key: 'name',
      align: 'left',
      filteredValue: colStoreName ? [colStoreName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('stores.list.filterStore')}
          value={colStoreName}
          onApply={setColStoreName}
          onReset={() => setColStoreName('')}
          confirm={confirm}
        />
      ),
      render: (_, row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">#{row.id}</p>
        </div>
      ),
    },
    {
      title: t('stores.list.colSellerId'),
      dataIndex: 'ownerId',
      key: 'ownerId',
      align: 'left',
      width: 100,
      filteredValue: colOwnerId ? [colOwnerId] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('stores.list.filterSellerId')}
          value={colOwnerId}
          onApply={setColOwnerId}
          onReset={() => setColOwnerId('')}
          confirm={confirm}
        />
      ),
      render: (v) => (
        <span className="tabular-nums text-slate-700">{v || t('shared.emDash')}</span>
      ),
    },
    ...(!restaurantMode
      ? [
          {
            title: t('stores.list.colType'),
            dataIndex: 'storeType',
            key: 'storeType',
            align: 'left',
            width: 120,
            render: (value) => (
              <Tag color={value === 'restaurant' ? 'orange' : undefined} style={{ marginInlineEnd: 0 }}>
                {t(`stores.types.${value || 'global'}`)}
              </Tag>
            ),
          },
        ]
      : []),
    {
      title: t('stores.list.colSellerEmail'),
      dataIndex: 'ownerEmail',
      key: 'ownerEmail',
      align: 'left',
      filteredValue: colOwnerEmail ? [colOwnerEmail] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('stores.list.filterEmail')}
          value={colOwnerEmail}
          onApply={setColOwnerEmail}
          onReset={() => setColOwnerEmail('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-700">{v || t('shared.emDash')}</span>,
    },
    {
      title: t('stores.list.colPhone'),
      dataIndex: 'phone',
      key: 'phone',
      align: 'left',
      filteredValue: colPhone ? [colPhone] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('stores.list.filterPhone')}
          value={colPhone}
          onApply={setColPhone}
          onReset={() => setColPhone('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-700">{v || t('shared.emDash')}</span>,
    },
    {
      title: t('stores.list.colAddress'),
      dataIndex: 'address',
      key: 'address',
      align: 'left',
      ellipsis: true,
      filteredValue: colAddress ? [colAddress] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('stores.list.filterAddress')}
          value={colAddress}
          onApply={setColAddress}
          onReset={() => setColAddress('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-600 text-sm">{v || t('shared.emDash')}</span>,
    },
    {
      title: t('stores.list.colDesc'),
      dataIndex: 'description',
      key: 'description',
      align: 'left',
      width: 260,
      filteredValue: colDesc ? [colDesc] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('stores.list.filterDesc')}
          value={colDesc}
          onApply={setColDesc}
          onReset={() => setColDesc('')}
          confirm={confirm}
        />
      ),
      render: (v) => (
        <TruncatedTextCell text={v} emptyLabel={t('shared.emDash')} />
      ),
    },
    ...(restaurantMode
      ? [
          {
            title: t('restaurants.list.colHours'),
            key: 'hours',
            align: 'left',
            width: 150,
            render: (_, row) => (
              <span className="whitespace-nowrap text-sm text-slate-700">
                {row.startWorkingAt && row.endWorkingAt
                  ? `${String(row.startWorkingAt).slice(0, 5)} – ${String(row.endWorkingAt).slice(0, 5)}`
                  : t('restaurants.list.alwaysOpen')}
              </span>
            ),
          },
          {
            title: t('restaurants.list.colPreparation'),
            dataIndex: 'preparationTime',
            key: 'preparationTime',
            align: 'left',
            width: 120,
            render: (value) =>
              value == null ? t('shared.emDash') : t('restaurants.list.minutes', { count: value }),
          },
          {
            title: t('restaurants.list.colOpenNow'),
            dataIndex: 'isOpenNow',
            key: 'isOpenNow',
            align: 'left',
            width: 100,
            render: (value) => (
              <Tag color={value ? 'green' : 'red'} style={{ marginInlineEnd: 0 }}>
                {t(value ? 'restaurants.list.open' : 'restaurants.list.closed')}
              </Tag>
            ),
          },
        ]
      : []),
    {
      title: t('stores.list.colActive'),
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'left',
      width: 100,
      filteredValue: colActive && colActive.length ? colActive : null,
      filterDropdown: ({ confirm }) => (
        <TriStateColumnFilter
          options={[
            { value: 'yes', label: t('shared.yes') },
            { value: 'no', label: t('shared.no') },
          ]}
          value={colActive}
          onApply={setColActive}
          confirm={confirm}
        />
      ),
      render: (_, row) => <StoreActiveSwitch row={row} mutation={setStoreActiveMutation} />,
    },
    {
      title: t('stores.list.colBrand'),
      dataIndex: 'isBrand',
      key: 'isBrand',
      align: 'left',
      width: 90,
      filteredValue: colBrand && colBrand.length ? colBrand : null,
      filterDropdown: ({ confirm }) => (
        <TriStateColumnFilter
          options={[
            { value: 'yes', label: t('shared.yes') },
            { value: 'no', label: t('shared.no') },
          ]}
          value={colBrand}
          onApply={setColBrand}
          confirm={confirm}
        />
      ),
      render: (_, row) => <StoreBrandSwitch row={row} mutation={setStoreBrandMutation} />,
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      align: 'left',
      width: 140,
      fixed: 'right',
      render: (_, row) => (
        <TableRowActions
          editTo={`/${restaurantMode ? 'restaurants' : 'stores'}/${row.id}/edit`}
          showDelete
          deleteLoading={String(deletingId) === String(row.id)}
          onDelete={async () => {
            setDeletingId(row.id)
            try {
              await deleteStore(row.id)
              message.success(t(restaurantMode ? 'restaurants.list.deleted' : 'stores.list.deleted'))
            } catch (err) {
              message.error(
                err?.message ??
                  t(restaurantMode ? 'restaurants.list.deleteErr' : 'stores.list.deleteErr'),
              )
            } finally {
              setDeletingId(null)
            }
          }}
          deleteTitle={t(
            restaurantMode ? 'restaurants.list.deleteTitle' : 'stores.list.deleteTitle',
          )}
          deleteDescription={t(
            restaurantMode ? 'restaurants.list.deleteDesc' : 'stores.list.deleteDesc',
          )}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title={t(restaurantMode ? 'restaurants.list.loadError' : 'stores.list.loadError')}
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => fetchStores()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}

      <Card
        title={t(restaurantMode ? 'restaurants.list.title' : 'stores.list.title', {
          suffix: titleSuffix,
        })}
        actions={
          <DashboardAddLinkButton to={restaurantMode ? '/restaurants/create' : '/stores/create'}>
            {t(restaurantMode ? 'restaurants.list.newRestaurant' : 'stores.list.newStore')}
          </DashboardAddLinkButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t(
              restaurantMode ? 'restaurants.list.searchPlaceholder' : 'stores.list.searchPlaceholder',
            )}
            searchValue={search}
            onSearchChange={setSearch}
            filterSlot={
              <>
                <Select
                  value={activeFilter}
                  onChange={setActiveFilter}
                  className="min-w-[130px]"
                  options={[
                    { value: 'all', label: t('stores.list.activeAny') },
                    { value: 'yes', label: t('stores.list.activeYes') },
                    { value: 'no', label: t('stores.list.activeNo') },
                  ]}
                />
                <Select
                  value={brandFilter}
                  onChange={setBrandFilter}
                  className="min-w-[130px]"
                  options={[
                    { value: 'all', label: t('stores.list.brandAny') },
                    { value: 'yes', label: t('stores.list.brandYes') },
                    { value: 'no', label: t('stores.list.brandNo') },
                  ]}
                />
              </>
            }
          />
          <Table
            rowKey="id"
            columns={columns}
            dataSource={displayData}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total: displayTotal,
              showTotal: (total) =>
                t(restaurantMode ? 'restaurants.list.pagination' : 'stores.list.pagination', {
                  count: total,
                }),
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
