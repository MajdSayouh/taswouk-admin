// View layer: products list — presentational only; data and loading come from useProductsViewModel.
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, Tag, Button as AntButton, Space, Alert, Spin } from 'antd'
import { Link } from 'react-router-dom'

export function ProductsListPage() {
  const { products, loading, error, fetchProducts } = useProductsViewModel()

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (value) => <span className="font-medium text-slate-900">{value}</span>,
    },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v) => <span className="text-slate-700">{v}</span> },
    {
      title: 'Description',
      dataIndex: 'category',
      key: 'category',
      render: (v) => <span className="text-slate-700">{v}</span>,
    },
    {
      title: 'Price (SAR)',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (v) => <span className="tabular-nums text-slate-900">{Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      align: 'right',
      render: (stock) => {
        const n = Number(stock)
        const tag =
          n <= 0 ? (
            <Tag color="red" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
              Out
            </Tag>
          ) : n <= 10 ? (
            <Tag color="gold" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
              Low
            </Tag>
          ) : (
            <Tag color="green" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
              In stock
            </Tag>
          )

        return (
          <span className="inline-flex items-center justify-end gap-2">
            <span className="tabular-nums text-slate-900">{n}</span>
            {tag}
          </span>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'right',
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
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <AntButton size="small" onClick={() => window.alert(`Item #${record.id} — edit UI can open a detail route later.`)}>
            Details
          </AntButton>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          message="Could not load products"
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => fetchProducts()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <Card
        title={`Products (${products.length})`}
        actions={
          <Button as={Link} to="/admin/products/create">
            + New Product
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={products}
            pagination={false}
            size="middle"
          />
        </Spin>
      </Card>
    </div>
  )
}
