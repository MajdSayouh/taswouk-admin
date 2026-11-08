// Price of an external-shop order, read-only: its share of a purchase batch, or the price entered
// on the order itself before batches existed. New prices only come from a purchase batch.
import { useTranslation } from 'react-i18next'
import { Alert, Descriptions, Spin } from 'antd'
import { LockOutlined, PaperClipOutlined } from '@ant-design/icons'
import { useExternalInvoice } from '../../viewmodels/useExternalInvoicesViewModel.js'
import { formatSyp } from '../../utils/externalOrder.js'

function FileLink({ url, name, fallback }) {
  if (!url) return '—'
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <PaperClipOutlined className="me-1" />
      {name || fallback}
    </a>
  )
}

/** @param {{ orderId: number | string }} props */
export function ExternalInvoicePanel({ orderId }) {
  const { t } = useTranslation('pages')
  const invoiceQuery = useExternalInvoice(orderId)

  if (invoiceQuery.isLoading) {
    return <Spin size="small" />
  }
  if (invoiceQuery.isError) {
    return <Alert type="error" showIcon title={invoiceQuery.error?.message} />
  }

  const invoice = invoiceQuery.data
  if (!invoice) {
    return <Alert type="info" showIcon title={t('externalInvoices.notPriced')} />
  }

  return (
    <Descriptions bordered size="small" column={1}>
      <Descriptions.Item label={t('externalInvoices.amount')}>
        <span className="font-semibold text-slate-900">{formatSyp(invoice.amount)}</span>
        <LockOutlined className="ms-2 text-slate-400" title={t('externalInvoices.locked')} />
      </Descriptions.Item>
      {invoice.batch_id != null ? (
        <>
          <Descriptions.Item label={t('externalInvoices.purchaseAmount')}>
            {formatSyp(invoice.purchase_amount)}
          </Descriptions.Item>
          <Descriptions.Item label={t('externalInvoices.batch')}>#{invoice.batch_id}</Descriptions.Item>
          <Descriptions.Item label={t('externalInvoices.itemsFile')}>
            <FileLink
              url={invoice.items_file_url}
              name={invoice.items_filename}
              fallback={t('externalInvoices.viewFile')}
            />
          </Descriptions.Item>
        </>
      ) : null}
      <Descriptions.Item label={t('externalInvoices.file')}>
        <FileLink
          url={invoice.invoice_url}
          name={invoice.original_filename}
          fallback={t('externalInvoices.viewFile')}
        />
      </Descriptions.Item>
      {invoice.note ? (
        <Descriptions.Item label={t('externalInvoices.note')}>{invoice.note}</Descriptions.Item>
      ) : null}
      <Descriptions.Item label={t('externalInvoices.enteredBy')}>
        {invoice.created_by_name || `#${invoice.created_by_id}`} ·{' '}
        {new Date(invoice.created_at).toLocaleString()}
      </Descriptions.Item>
    </Descriptions>
  )
}
