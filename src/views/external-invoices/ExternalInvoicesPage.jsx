// Delivered external-shop orders that still have no price. Each one is a sale the accounting
// system counts at 0 until an admin enters its price and invoice here.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Empty, Modal, Table } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ExternalInvoicePanel } from '../../components/orders/ExternalInvoicePanel.jsx'
import { usePendingExternalInvoices } from '../../viewmodels/useExternalInvoicesViewModel.js'

export function ExternalInvoicesPage() {
  const { t } = useTranslation('pages')
  const query = usePendingExternalInvoices()
  const [activeOrderId, setActiveOrderId] = useState(/** @type {number | null} */ (null))

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
    {
      title: '',
      key: 'action',
      render: (_, r) => (
        <Button variant="primary" onClick={() => setActiveOrderId(r.order_id)}>
          {t('externalInvoices.enterPrice')}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <Card title={t('externalInvoices.title')}>
        <p className="text-sm text-slate-600 mb-4 max-w-2xl">{t('externalInvoices.intro')}</p>
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

      <Modal
        open={activeOrderId != null}
        title={t('externalInvoices.modalTitle', { id: activeOrderId })}
        footer={null}
        onCancel={() => setActiveOrderId(null)}
        destroyOnHidden
      >
        {activeOrderId != null ? (
          <ExternalInvoicePanel
            orderId={activeOrderId}
            delivered
            onSaved={() => setActiveOrderId(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}
