// View: products — toolbar + column filter dropdowns (single useMemo), left-aligned, red delete.
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Table, Tag, Space, Alert, Spin, Popconfirm, message, Select, Button as AntButton } from 'antd'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useAuthStore, isAdminRole, isSellerRole } from '../../store/authStore.js'
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import {
  matchesActiveTriState,
  rowMatchesSearch,
} from '../../utils/tableFilters.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const DEFAULT_PAGE_SIZE = 10

function StoreColumnFilter({ options, value, onApply, confirm }) {
  const [local, setLocal] = useState(value || [])
  useEffect(() => {
    setLocal(value || [])
  }, [value])
  return (
    <div className="p-2 w-56" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder="Stores"
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

function StatusColumnFilter({ value, onApply, confirm }) {
  const [local, setLocal] = useState(value || [])
  return (
    <div className="p-2 w-52" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder="Status"
        className="w-full mb-2"
        value={local}
        onChange={setLocal}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
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

export function ProductsListPage() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const [adminStoreFilter, setAdminStoreFilter] = useState(/** @type {string | null} */ (null))

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: () => storeService.listStores(),
    enabled: !!(token && user),
  })

  const storesForFilter = Array.isArray(storesQuery.data) ? storesQuery.data : []

  const productListParams = useMemo(() => {
    if (!user) return {}
    if (isSellerRole(user.role)) {
      return storesForFilter.length === 1 && storesForFilter[0]?.id != null
        ? { store_id: Number(storesForFilter[0].id) }
        : {}
    }
    if (isAdminRole(user.role)) {
      return adminStoreFilter != null && adminStoreFilter !== ''
        ? { store_id: Number(adminStoreFilter) }
        : {}
    }
    return {}
  }, [user, adminStoreFilter, storesForFilter])

  const productsQueryEnabled =
    !!token &&
    !!user &&
    (!isSellerRole(user.role) || storesQuery.isSuccess || storesQuery.isError)

  const { products, loading, error, refetch, deleteProduct } = useProductsViewModel({
    listParams: productListParams,
    enabled: productsQueryEnabled,
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(
    /** @type {'all' | 'active' | 'inactive'} */ ('all'),
  )

  const [colName, setColName] = useState('')
  const [colSku, setColSku] = useState('')
  const [colDesc, setColDesc] = useState('')
  const [colPrice, setColPrice] = useState('')
  /** @type {string[] | null} */
  const [colStore, setColStore] = useState(null)
  /** @type {string[] | null} */
  const [colStatus, setColStatus] = useState(null)

  const storeFilterOptions = useMemo(() => {
    const ids = [...new Set(products.map((p) => p.storeId).filter(Boolean))]
    return ids.sort().map((id) => ({ label: `Store #${id}`, value: id }))
  }, [products])

  const displayData = useMemo(() => {
    return products.filter((p) => {
      if (!matchesActiveTriState(statusFilter, p.isActive)) return false
      if (!rowMatchesSearch(search, p.name, p.sku, p.category, p.storeId, p.id)) return false
      if (colName && !String(p.name ?? '').toLowerCase().includes(colName.toLowerCase())) return false
      if (colSku && !String(p.sku ?? '').toLowerCase().includes(colSku.toLowerCase())) return false
      if (colDesc && !String(p.category ?? '').toLowerCase().includes(colDesc.toLowerCase())) return false
      if (colPrice && !String(p.price ?? '').includes(colPrice)) return false
      if (colStore && colStore.length && !colStore.includes(String(p.storeId))) return false
      if (colStatus && colStatus.length) {
        const active = colStatus.includes('active')
        const inactive = colStatus.includes('inactive')
        if (active && !inactive && !p.isActive) return false
        if (inactive && !active && p.isActive) return false
      }
      return true
    })
  }, [products, search, statusFilter, colName, colSku, colDesc, colPrice, colStore, colStatus])

  const displayTotal = displayData.length

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, colName, colSku, colDesc, colPrice, colStore, colStatus])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayTotal, pageSize, page])

  async function handleDelete(productId) {
    setDeletingId(productId)
    try {
      await deleteProduct(productId)
      message.success('Product deleted')
    } catch (e) {
      message.error(e?.message ?? 'Delete failed')
      await refetch()
    } finally {
      setDeletingId(null)
    }
  }

  const titleSuffix =
    displayTotal !== products.length
      ? `${displayTotal} shown · ${products.length} total`
      : `${displayTotal}`

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      filteredValue: colName ? [colName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter name"
          value={colName}
          onApply={(v) => setColName(v)}
          onReset={() => setColName('')}
          confirm={confirm}
        />
      ),
      render: (value, record) => (
        <Link
          to={`/admin/products/${record.id}`}
          className="font-medium text-slate-900 hover:text-[#FF7D29]"
        >
          {value}
        </Link>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      align: 'left',
      filteredValue: colSku ? [colSku] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter SKU"
          value={colSku}
          onApply={(v) => setColSku(v)}
          onReset={() => setColSku('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-700">{v}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      align: 'left',
      filteredValue: colDesc ? [colDesc] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter category"
          value={colDesc}
          onApply={(v) => setColDesc(v)}
          onReset={() => setColDesc('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="text-slate-700">{v}</span>,
    },
    {
      title: 'Price (SAR)',
      dataIndex: 'price',
      key: 'price',
      align: 'left',
      filteredValue: colPrice ? [colPrice] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter price (text)"
          value={colPrice}
          onApply={(v) => setColPrice(v)}
          onReset={() => setColPrice('')}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="tabular-nums text-slate-900">{Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Store',
      dataIndex: 'storeId',
      key: 'storeId',
      align: 'left',
      filteredValue: colStore && colStore.length ? colStore : null,
      filterDropdown: ({ confirm }) => (
        <StoreColumnFilter
          options={storeFilterOptions}
          value={colStore}
          onApply={setColStore}
          confirm={confirm}
        />
      ),
      render: (v) => <span className="tabular-nums text-slate-700">{v ? `#${v}` : '—'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'left',
      filteredValue: colStatus && colStatus.length ? colStatus : null,
      filterDropdown: ({ confirm }) => (
        <StatusColumnFilter value={colStatus} onApply={setColStatus} confirm={confirm} />
      ),
      render: (isActive) =>
        isActive ? (
          <Tag color="green" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
            Active
          </Tag>
        ) : (
          <Tag color="default" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
            Inactive
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'left',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Link
            to={`/admin/products/${record.id}/edit`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-[#FF7D29]"
            aria-label="Edit product"
          >
            <EditOutlined />
          </Link>
          <Popconfirm
            title="Delete this product?"
            description="This cannot be undone."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <AntButton
              type="text"
              disabled={deletingId === record.id}
              className="!text-red-600 hover:!text-red-700 hover:!bg-red-50"
              icon={<DeleteOutlined className="!text-red-600" />}
              aria-label="Delete product"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (token && !user) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title="Could not load products"
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <Card
        title={`Products (${titleSuffix})`}
        actions={
          <Button as={Link} to="/admin/products/create">
            + New Product
          </Button>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder="Search name, SKU, store, category, ID…"
            searchValue={search}
            onSearchChange={setSearch}
            filterSlot={
              <>
                {user && isAdminRole(user.role) ? (
                  <Select
                    allowClear
                    placeholder="All stores"
                    className="min-w-[168px]"
                    value={adminStoreFilter ?? undefined}
                    onChange={(v) => setAdminStoreFilter(v ?? null)}
                    options={storesForFilter.map((s) => ({
                      label:
                        s?.name != null && String(s.name).trim()
                          ? `${s.name} (#${s.id})`
                          : `Store #${s?.id}`,
                      value: String(s?.id ?? ''),
                    }))}
                  />
                ) : null}
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="min-w-[140px]"
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'active', label: 'Active only' },
                    { value: 'inactive', label: 'Inactive only' },
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
              showTotal: (t) => `${t} products`,
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            }}
            size="middle"
          />
        </Spin>
      </Card>
    </div>
  )
}
