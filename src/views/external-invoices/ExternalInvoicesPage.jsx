// Purchase batches price external-shop orders: upload one here, see earlier ones, and see the
// delivered orders no batch has covered yet (the accounting system counts those at 0).
import { useTranslation } from 'react-i18next'
import { Alert, Empty, Table } from 'antd'
import { PaperClipOutlined } from '@ant-design/icons'
import { Card } from '../../components/ui/Card'
import {
  usePendingExternalInvoices,
  usePurchaseBatches,
} from '../../viewmodels/useExternalInvoicesViewModel.js'
import { formatSyp } from '../../utils/externalOrder.js'
import { PurchaseBatchForm } from './PurchaseBatchForm.jsx'

function FileLink({ url, name }) {
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <PaperClipOutlined className="me-1" />
      {name}
    </a>
  )
}

export function ExternalInvoicesPage() {
  const { t } = useTranslation('pages')
  const query = usePendingExternalInvoices()
  const batchesQuery = usePurchaseBatches()

  const rows = query.data?.items ?? []
  const count = query.data?.count ?? 0

  const columns = [
    { title: t('externalInvoices.col.order'), dataIndex: 'order_id', render: (id) => `#${id}` },
    { title: t('externalInvoices.col.shop'), dataIndex: 'shop_name', render: (v) => v || '—' },
    {
      title: t('externalInvoices.col.customer'),
      key: 'customer',
      render: (_, r) => (
        <span>
          {r.customer_name || '—'}
          {r.customer_phone ? <span className="block text-xs text-slate-500">{r.customer_phone}</span> : null}
        </span>
      ),
    },
    {
      title: t('externalInvoices.col.items'),
      dataIndex: 'items',
      render: (items) => (
        <ul className="m-0 ps-4">
          {(items ?? []).map((item, i) => (
            <li key={i}>
              {item.external_url ? (
                <a href={item.external_url} target="_blank" rel="noopener noreferrer">
                  {item.product_name}
                </a>
              ) : (
                item.product_name
              )}{' '}
              × {item.quantity}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: t('externalInvoices.col.deliveredAt'),
      dataIndex: 'delivered_at',
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
  ]

  const batchColumns = [
    { title: t('externalInvoices.batch'), dataIndex: 'id', render: (id) => `#${id}` },
    { title: t('externalInvoices.purchaseTotal'), dataIndex: 'purchase_total', render: formatSyp },
    { title: t('externalInvoices.saleTotal'), dataIndex: 'sale_total', render: formatSyp },
    {
      title: t('externalInvoices.col.delivered'),
      key: 'delivered',
      render: (_, r) => `${r.delivered_orders_count} / ${r.orders_count}`,
    },
    {
      title: t('externalInvoices.col.files'),
      key: 'files',
      render: (_, r) => (
        <>
          <FileLink url={r.items_file_url} name={r.items_filename} />
          <FileLink url={r.receipt_url} name={r.receipt_filename} />
        </>
      ),
    },
    {
      title: t('externalInvoices.enteredBy'),
      key: 'by',
      render: (_, r) => (
        <span>
          {r.created_by_name || `#${r.created_by_id}`}
          <span className="block text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <Card title={t('externalInvoices.title')}>
        <p className="text-sm text-slate-600 mb-4 max-w-2xl">{t('externalInvoices.intro')}</p>
        <PurchaseBatchForm />
      </Card>

      <Card title={t('externalInvoices.pendingTitle')}>
        {query.isError ? (
          <Alert type="error" showIcon className="mb-4" title={query.error?.message} />
        ) : null}
        {count > 0 ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            title={t('externalInvoices.pendingBanner', { count })}
          />
        ) : null}
        <Table
          rowKey="order_id"
          size="small"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: true }}
          locale={{ emptyText: <Empty description={t('externalInvoices.empty')} /> }}
        />
      </Card>

      <Card title={t('externalInvoices.batchesTitle')}>
        {batchesQuery.isError ? (
          <Alert type="error" showIcon className="mb-4" title={batchesQuery.error?.message} />
        ) : null}
        <Table
          rowKey="id"
          size="small"
          loading={batchesQuery.isLoading}
          columns={batchColumns}
          dataSource={batchesQuery.data?.items ?? []}
          pagination={false}
          scroll={{ x: true }}
          locale={{ emptyText: <Empty description={t('externalInvoices.batchesEmpty')} /> }}
        />
      </Card>
    </div>
  )
}
