// Price of an external-shop order: shown read-only once entered, otherwise a one-time form.
// The backend accepts it only after delivery and never lets it change, so the form makes the
// admin re-type the amount in a confirmation step before anything is uploaded.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Descriptions, Form, Input, InputNumber, Modal, Spin, Upload, message } from 'antd'
import { LockOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons'
import {
  useCreateExternalInvoice,
  useExternalInvoice,
} from '../../viewmodels/useExternalInvoicesViewModel.js'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
const MAX_BYTES = 8 * 1024 * 1024

function formatSyp(value) {
  return `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} SYP`
}

/**
 * @param {{ orderId: number | string, delivered: boolean, onSaved?: () => void }} props
 */
export function ExternalInvoicePanel({ orderId, delivered, onSaved }) {
  const { t } = useTranslation('pages')
  const invoiceQuery = useExternalInvoice(orderId)

  if (invoiceQuery.isLoading) {
    return <Spin size="small" />
  }
  if (invoiceQuery.isError) {
    return <Alert type="error" showIcon title={invoiceQuery.error?.message} />
  }

  const invoice = invoiceQuery.data
  if (invoice) {
    return (
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label={t('externalInvoices.amount')}>
          <span className="font-semibold text-slate-900">{formatSyp(invoice.amount)}</span>
          <LockOutlined className="ms-2 text-slate-400" title={t('externalInvoices.locked')} />
        </Descriptions.Item>
        <Descriptions.Item label={t('externalInvoices.file')}>
          {invoice.invoice_url ? (
            <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
              <PaperClipOutlined className="me-1" />
              {invoice.original_filename || t('externalInvoices.viewFile')}
            </a>
          ) : (
            '—'
          )}
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

  if (!delivered) {
    return <Alert type="info" showIcon title={t('externalInvoices.afterDelivery')} />
  }

  return <ExternalInvoiceForm orderId={orderId} onSaved={onSaved} />
}

function ExternalInvoiceForm({ orderId, onSaved }) {
  const { t } = useTranslation('pages')
  const [form] = Form.useForm()
  const [file, setFile] = useState(/** @type {File | null} */ (null))
  const [pending, setPending] = useState(/** @type {{ amount: number, note: string } | null} */ (null))
  const [confirmText, setConfirmText] = useState('')
  const mutation = useCreateExternalInvoice()

  function onFinish(values) {
    if (!file) {
      message.error(t('externalInvoices.fileRequired'))
      return
    }
    setConfirmText('')
    setPending({ amount: Number(values.amount), note: values.note ?? '' })
  }

  const confirmMatches =
    pending != null && confirmText.trim() !== '' && Number(confirmText) === pending.amount

  async function submit() {
    if (!pending || !file || !confirmMatches) return
    try {
      await mutation.mutateAsync({ orderId, amount: pending.amount, note: pending.note, file })
      message.success(t('externalInvoices.saved'))
      setPending(null)
      onSaved?.()
    } catch (err) {
      message.error(err?.message ?? t('externalInvoices.saveFailed'))
    }
  }

  return (
    <>
      <Alert type="warning" showIcon className="mb-3" title={t('externalInvoices.finalWarning')} />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="amount"
          label={t('externalInvoices.amountLabel')}
          rules={[
            { required: true, message: t('externalInvoices.amountRequired') },
            {
              validator: (_, value) =>
                value == null || Number(value) > 0
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('externalInvoices.amountRequired'))),
            },
          ]}
        >
          <InputNumber className="w-full" min={0.01} precision={2} addonAfter="SYP" />
        </Form.Item>
        <Form.Item label={t('externalInvoices.fileLabel')} required>
          <Upload
            accept={ACCEPT}
            maxCount={1}
            fileList={file ? [{ uid: '1', name: file.name, status: 'done' }] : []}
            beforeUpload={(f) => {
              if (f.size > MAX_BYTES) {
                message.error(t('externalInvoices.fileTooLarge'))
                return Upload.LIST_IGNORE
              }
              setFile(f)
              return false
            }}
            onRemove={() => setFile(null)}
          >
            <Button icon={<UploadOutlined />}>{t('externalInvoices.chooseFile')}</Button>
          </Upload>
          <p className="text-xs text-slate-500 mt-1">{t('externalInvoices.fileHint')}</p>
        </Form.Item>
        <Form.Item name="note" label={t('externalInvoices.note')}>
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
        <Form.Item className="mb-0">
          <Button type="primary" htmlType="submit">
            {t('externalInvoices.review')}
          </Button>
        </Form.Item>
      </Form>

      <Modal
        open={pending != null}
        title={t('externalInvoices.confirmTitle', { id: orderId })}
        okText={t('externalInvoices.confirmOk')}
        cancelText={t('externalInvoices.confirmBack')}
        okButtonProps={{ danger: true, disabled: !confirmMatches, loading: mutation.isPending }}
        onOk={submit}
        onCancel={() => (mutation.isPending ? null : setPending(null))}
        destroyOnHidden
      >
        {pending ? (
          <div className="space-y-3">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label={t('externalInvoices.amount')}>
                <span className="font-semibold text-lg">{formatSyp(pending.amount)}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t('externalInvoices.file')}>{file?.name}</Descriptions.Item>
              {pending.note ? (
                <Descriptions.Item label={t('externalInvoices.note')}>{pending.note}</Descriptions.Item>
              ) : null}
            </Descriptions>
            <Alert type="error" showIcon title={t('externalInvoices.confirmWarning')} />
            <div>
              <label className="text-sm text-slate-700 block mb-1">
                {t('externalInvoices.retypeAmount')}
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                inputMode="decimal"
                autoFocus
                status={confirmText && !confirmMatches ? 'error' : undefined}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
