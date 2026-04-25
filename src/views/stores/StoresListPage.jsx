// View: stores — toolbar + column filter dropdowns, left-aligned.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table, Tag, Space, Alert, Spin, Select, Button as AntButton } from 'antd'
import { useStoresViewModel } from '../../viewmodels/useStoresViewModel'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import {
  matchesYesNoTriState,
  rowMatchesSearch,
} from '../../utils/tableFilters.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const DEFAULT_PAGE_SIZE = 10

function TriStateColumnFilter({ options, value, onApply, confirm }) {
  const [local, setLocal] = useState(value || [])
  useEffect(() => {
    setLocal(value || [])
  }, [value])
  return (
    <div className="p-2 w-52" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder="Filter"
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
          Apply
        </AntButton>
        <AntButton
          size="small"
          onClick={() => {
            setLocal([])
            onApply(null)
            confirm()
          }}
        >
          Reset
        </AntButton>
      </Space>
    </div>
  )
}

export function StoresListPage() {
  const { stores, loading, error, fetchStores } = useStoresViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(/** @type {'all' | 'yes' | 'no'} */ ('all'))
  const [brandFilter, setBrandFilter] = useState(/** @type {'all' | 'yes' | 'no'} */ ('all'))

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

  const displayData = useMemo(() => {
    return stores.filter((row) => {
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
    stores,
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
    displayTotal !== stores.length
      ? `${displayTotal} shown · ${stores.length} total`
      : `${displayTotal}`

  const columns = [
    {
      title: 'Store',
      key: 'name',
      align: 'left',
      filteredValue: colStoreName ? [colStoreName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter store name"
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
      title: 'Seller ID',
      dataIndex: 'ownerId',
      key: 'ownerId',
      align: 'left',
      width: 100,
      filteredValue: colOwnerId ? [colOwnerId] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter seller ID"
          value={colOwnerId}
          onApply={setColOwnerId}
          onReset={() => setColOwnerId('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="tabular-nums text-slate-700">{v || '—'}</span>,
    },
    {
      title: 'Seller email',
      dataIndex: 'ownerEmail',
      key: 'ownerEmail',
      align: 'left',
      filteredValue: colOwnerEmail ? [colOwnerEmail] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter email"
          value={colOwnerEmail}
          onApply={setColOwnerEmail}
          onReset={() => setColOwnerEmail('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-700">{v || '—'}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      align: 'left',
      filteredValue: colPhone ? [colPhone] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter phone"
          value={colPhone}
          onApply={setColPhone}
          onReset={() => setColPhone('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-700">{v || '—'}</span>,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      align: 'left',
      ellipsis: true,
      filteredValue: colAddress ? [colAddress] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter address"
          value={colAddress}
          onApply={setColAddress}
          onReset={() => setColAddress('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-600 text-sm">{v || '—'}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      align: 'left',
      ellipsis: true,
      filteredValue: colDesc ? [colDesc] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter description"
          value={colDesc}
          onApply={setColDesc}
          onReset={() => setColDesc('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-600 text-sm">{v || '—'}</span>,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'left',
      width: 100,
      filteredValue: colActive && colActive.length ? colActive : null,
      filterDropdown: ({ confirm }) => (
        <TriStateColumnFilter
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value={colActive}
          onApply={setColActive}
          confirm={confirm}
        />
      ),
      render: (isActive) =>
        isActive ? (
          <Tag color="green" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
            Yes
          </Tag>
        ) : (
          <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>No</Tag>
        ),
    },
    {
      title: 'Brand',
      dataIndex: 'isBrand',
      key: 'isBrand',
      align: 'left',
      width: 90,
      filteredValue: colBrand && colBrand.length ? colBrand : null,
      filterDropdown: ({ confirm }) => (
        <TriStateColumnFilter
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value={colBrand}
          onApply={setColBrand}
          confirm={confirm}
        />
      ),
      render: (isBrand) =>
        isBrand ? (
          <Tag color="blue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
            Yes
          </Tag>
        ) : (
          <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>No</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'left',
      width: 100,
      render: (_, row) => (
        <Space size="small">
          <Button as={Link} variant="ghost" to={`/admin/stores/${row.id}/edit`}>
            Edit
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title="Could not load stores"
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => fetchStores()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <Card
        title={`Stores (${titleSuffix})`}
        actions={
          <Button as={Link} to="/admin/stores/create">
            + New store
          </Button>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder="Search name, ID, seller, phone, address…"
            searchValue={search}
            onSearchChange={setSearch}
            filterSlot={
              <>
                <Select
                  value={activeFilter}
                  onChange={setActiveFilter}
                  className="min-w-[130px]"
                  options={[
                    { value: 'all', label: 'Active: any' },
                    { value: 'yes', label: 'Active: yes' },
                    { value: 'no', label: 'Active: no' },
                  ]}
                />
                <Select
                  value={brandFilter}
                  onChange={setBrandFilter}
                  className="min-w-[130px]"
                  options={[
                    { value: 'all', label: 'Brand: any' },
                    { value: 'yes', label: 'Brand: yes' },
                    { value: 'no', label: 'Brand: no' },
                  ]}
                />
              </>
            }
          />
          <Table
            rowKey="id"
            columns={columns}
            dataSource={displayData}
            pagination={{
              current: page,
              pageSize,
              total: displayTotal,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (t) => `${t} stores`,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            }}
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      </Card>
    </div>
  )
}
