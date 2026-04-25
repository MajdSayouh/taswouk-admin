// View: orders — toolbar + column filter dropdowns, left-aligned.
import { useEffect, useMemo, useState } from 'react'
import { useOrdersViewModel } from '../../viewmodels/useOrdersViewModel'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { matchesStatusMultiFilter, rowMatchesSearch } from '../../utils/tableFilters.js'
import { Card } from '../../components/ui/Card'
import { Table, Tag, Button, Space, Alert, Spin, Select, Button as AntButton } from 'antd'

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

const DEFAULT_PAGE_SIZE = 10

function StatusColumnFilter({ options, value, onApply, confirm }) {
  const [local, setLocal] = useState(value || [])
  useEffect(() => {
    setLocal(value || [])
  }, [value])
  return (
    <div className="p-2 w-56" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder="Statuses"
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

export function OrdersListPage() {
  const { orders, loading, error, fetchOrders } = useOrdersViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  /** @type {string[]} */
  const [statusFilter, setStatusFilter] = useState([])

  const [colOrder, setColOrder] = useState('')
  const [colCustomer, setColCustomer] = useState('')
  const [colTotal, setColTotal] = useState('')
  /** @type {string[] | null} */
  const [colStatus, setColStatus] = useState(null)

  const statusOptions = useMemo(() => {
    const present = new Set(orders.map((o) => String(o.status || '').toLowerCase()))
    return ORDER_STATUSES.filter((s) => present.has(s)).map((s) => ({
      value: s,
      label: s.replace(/_/g, ' '),
    }))
  }, [orders])

  const displayData = useMemo(() => {
    return orders.filter((o) => {
      if (!matchesStatusMultiFilter(statusFilter, o.status)) return false
      if (!rowMatchesSearch(search, o.number, o.customerName, o.id, o.status, o.total)) return false
      if (colOrder && !String(o.number ?? '').toLowerCase().includes(colOrder.toLowerCase())) {
        return false
      }
      if (
        colCustomer &&
        !String(o.customerName ?? '').toLowerCase().includes(colCustomer.toLowerCase())
      ) {
        return false
      }
      if (colTotal && !String(o.total ?? '').includes(colTotal)) return false
      if (colStatus && colStatus.length && !colStatus.includes(String(o.status || '').toLowerCase())) {
        return false
      }
      return true
    })
  }, [orders, search, statusFilter, colOrder, colCustomer, colTotal, colStatus])

  const summary = useMemo(
    () => ({
      total: displayData.length,
      pending: displayData.filter((o) => o.status === 'pending').length,
      inProgress: displayData.filter((o) =>
        ['confirmed', 'preparing', 'out_for_delivery'].includes(o.status),
      ).length,
      delivered: displayData.filter((o) => o.status === 'delivered').length,
    }),
    [displayData],
  )

  const displayTotal = displayData.length

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, colOrder, colCustomer, colTotal, colStatus])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayTotal, pageSize, page])

  const columns = [
    {
      title: 'Order',
      dataIndex: 'number',
      key: 'number',
      align: 'left',
      filteredValue: colOrder ? [colOrder] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter order #"
          value={colOrder}
          onApply={setColOrder}
          onReset={() => setColOrder('')}
          confirm={confirm}
        />
      ),
      render: (value) => <span className="font-medium text-slate-900">{value}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      align: 'left',
      filteredValue: colCustomer ? [colCustomer] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter customer"
          value={colCustomer}
          onApply={setColCustomer}
          onReset={() => setColCustomer('')}
          confirm={confirm}
        />
      ),
      render: (value) => <span className="text-slate-700">{value}</span>,
    },
    {
      title: 'Total (SAR)',
      dataIndex: 'total',
      key: 'total',
      align: 'left',
      filteredValue: colTotal ? [colTotal] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder="Filter total (text)"
          value={colTotal}
          onApply={setColTotal}
          onReset={() => setColTotal('')}
          confirm={confirm}
        />
      ),
      render: (value) => (
        <span className="tabular-nums text-slate-900">{Number(value).toFixed(2)}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'left',
      filteredValue: colStatus && colStatus.length ? colStatus : null,
      filterDropdown: ({ confirm }) => (
        <StatusColumnFilter
          options={
            statusOptions.length
              ? statusOptions
              : ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))
          }
          value={colStatus}
          onApply={setColStatus}
          confirm={confirm}
        />
      ),
      render: (status) => {
        const s = String(status || '').replace(/_/g, ' ')
        switch (status) {
          case 'pending':
            return (
              <Tag color="gold" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Pending
              </Tag>
            )
          case 'confirmed':
            return (
              <Tag color="blue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Confirmed
              </Tag>
            )
          case 'preparing':
            return (
              <Tag color="geekblue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Preparing
              </Tag>
            )
          case 'out_for_delivery':
            return (
              <Tag color="cyan" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Out for delivery
              </Tag>
            )
          case 'delivered':
            return (
              <Tag color="green" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Delivered
              </Tag>
            )
          case 'cancelled':
            return (
              <Tag color="red" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Cancelled
              </Tag>
            )
          default:
            return (
              <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                {s || '—'}
              </Tag>
            )
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'left',
      render: () => (
        <Space size="small">
          <Button size="small" disabled>
            Details
          </Button>
        </Space>
      ),
    },
  ]

  const listTitle =
    displayTotal !== orders.length
      ? `Orders (${displayTotal} shown · ${orders.length} total)`
      : `Orders (${displayTotal})`

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="warning"
          title="Orders could not be loaded"
          description={
            <span>
              {error}. This screen uses <code className="text-xs">GET /api/orders/</code> (see{' '}
              <a
                href="https://test.taswouk.com/api/docs"
                className="text-[#FF7D29]"
                target="_blank"
                rel="noreferrer"
              >
                API docs
              </a>
              ).
            </span>
          }
          showIcon
          action={
            <Button type="link" size="small" onClick={() => fetchOrders()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Total orders (filtered)">
          <p className="text-2xl font-semibold text-slate-900">
            {summary.total.toLocaleString()}
          </p>
        </Card>
        <Card title="Pending">
          <p className="text-2xl font-semibold text-amber-600">
            {summary.pending.toLocaleString()}
          </p>
        </Card>
        <Card title="In progress">
          <p className="text-2xl font-semibold text-[#FF7D29]">
            {summary.inProgress.toLocaleString()}
          </p>
        </Card>
        <Card title="Delivered">
          <p className="text-2xl font-semibold text-emerald-600">
            {summary.delivered.toLocaleString()}
          </p>
        </Card>
      </div>

      <Card title={listTitle}>
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder="Search order #, customer, status, total…"
            searchValue={search}
            onSearchChange={setSearch}
            filterSlot={
              <Select
                mode="multiple"
                allowClear
                placeholder="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                className="min-w-[200px] max-w-full"
                options={
                  statusOptions.length
                    ? statusOptions
                    : ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))
                }
              />
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
              showTotal: (t) => `${t} orders`,
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
