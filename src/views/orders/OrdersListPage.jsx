// View layer: orders list — reads state from useOrdersViewModel (real `/api/orders` when available).
import { useOrdersViewModel } from '../../viewmodels/useOrdersViewModel'
import { Card } from '../../components/ui/Card'
import { Table, Tag, Button, Space, Alert, Spin } from 'antd'

export function OrdersListPage() {
  const { orders, summary, loading, error, fetchOrders } = useOrdersViewModel()

  const columns = [
    {
      title: 'Order',
      dataIndex: 'number',
      key: 'number',
      render: (value) => <span className="font-medium text-slate-900">{value}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (value) => <span className="text-slate-700">{value}</span>,
    },
    {
      title: 'Total (SAR)',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value) => <span className="tabular-nums text-slate-900">{Number(value).toFixed(2)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'right',
      render: (status) => {
        switch (status) {
          case 'paid':
            return (
              <Tag color="orange" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Paid
              </Tag>
            )
          case 'pending':
            return (
              <Tag color="gold" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Pending
              </Tag>
            )
          case 'shipped':
            return (
              <Tag color="blue" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                Shipped
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
                {status}
              </Tag>
            )
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: () => (
        <Space size="small">
          <Button size="small" disabled>
            Details
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="warning"
          message="Orders could not be loaded"
          description={
            <span>
              {error}. The public Taswouk API v2 spec does not yet expose orders; this screen calls{' '}
              <code className="text-xs">GET /api/orders</code> so it will work automatically when the backend adds it.
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
        <Card title="Total orders">
          <p className="text-2xl font-semibold text-slate-900">
            {summary.total.toLocaleString()}
          </p>
        </Card>
        <Card title="Pending">
          <p className="text-2xl font-semibold text-amber-600">
            {summary.pending.toLocaleString()}
          </p>
        </Card>
        <Card title="Paid">
          <p className="text-2xl font-semibold text-[#FF7D29]">
            {summary.paid.toLocaleString()}
          </p>
        </Card>
        <Card title="Shipped">
          <p className="text-2xl font-semibold text-sky-600">
            {summary.shipped.toLocaleString()}
          </p>
        </Card>
      </div>

      <Card title="Orders">
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={orders}
            pagination={false}
            size="middle"
          />
        </Spin>
      </Card>
    </div>
  )
}
