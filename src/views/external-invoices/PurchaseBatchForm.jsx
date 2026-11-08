// Upload of one purchase batch: the Excel sheet and receipt back the purchase total, and the sale
// total is entered alongside. Final once saved, so the admin re-types the sale total to confirm.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Descriptions, Form, Input, InputNumber, Modal, Upload, message } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useCreatePurchaseBatch } from '../../viewmodels/useExternalInvoicesViewModel.js'
import { downloadPurchaseBatchTemplate } from '../../services/externalInvoiceService.js'
import { formatSyp } from '../../utils/externalOrder.js'

// Together under nginx's 10 MB request limit; the backend enforces the same figures.
const ITEMS_MAX_BYTES = 3 * 1024 * 1024
const RECEIPT_MAX_BYTES = 6 * 1024 * 1024

function FilePicker({ accept, maxBytes, tooLargeMessage, file, onChange, label }) {
  return (
    <Upload
      accept={accept}
      maxCount={1}
      fileList={file ? [{ uid: '1', name: file.name, status: 'done' }] : []}
      beforeUpload={(f) => {
        if (f.size > maxBytes) {
          message.error(tooLargeMessage)
          return Upload.LIST_IGNORE
        }
        onChange(f)
        return false
      }}
      onRemove={() => onChange(null)}
    >
      <Button icon={<UploadOutlined />}>{label}</Button>
    </Upload>
  )
}

export function PurchaseBatchForm() {
  const { t } = useTranslation('pages')
  const [form] = Form.useForm()
  const [itemsFile, setItemsFile] = useState(/** @type {File | null} */ (null))
  const [receiptFile, setReceiptFile] = useState(/** @type {File | null} */ (null))
  const [pending, setPending] = useState(
    /** @type {{ purchaseTotal: number, saleTotal: number, note: string } | null} */ (null),
  )
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const mutation = useCreatePurchaseBatch()

  const positiveRule = {
    validator: (_, value) =>
      value == null || Number(value) > 0
        ? Promise.resolve()
        : Promise.reject(new Error(t('externalInvoices.amountRequired'))),
  }
  const requiredAmount = [{ required: true, message: t('externalInvoices.amountRequired') }, positiveRule]

  function onFinish(values) {
    if (!itemsFile || !receiptFile) {
      message.error(t('externalInvoices.filesRequired'))
      return
    }
    setConfirmText('')
    setError('')
    setPending({
      purchaseTotal: Number(values.purchaseTotal),
      saleTotal: Number(values.saleTotal),
      note: values.note ?? '',
    })
  }

  const confirmMatches =
    pending != null && confirmText.trim() !== '' && Number(confirmText) === pending.saleTotal

  async function submit() {
    if (!pending || !confirmMatches) return
    try {
      await mutation.mutateAsync({ ...pending, itemsFile, receiptFile })
      message.success(t('externalInvoices.saved'))
      setPending(null)
      setItemsFile(null)
      setReceiptFile(null)
      form.resetFields()
    } catch (err) {
      setError(err?.message ?? t('externalInvoices.saveFailed'))
    }
  }

  async function downloadTemplate() {
    try {
      await downloadPurchaseBatchTemplate()
    } catch (err) {
      message.error(err?.message ?? t('externalInvoices.saveFailed'))
    }
  }

  return (
    <>
      <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-xl">
        <Form.Item label={t('externalInvoices.itemsFile')} required>
          <FilePicker
            accept=".xlsx"
            maxBytes={ITEMS_MAX_BYTES}
            tooLargeMessage={t('externalInvoices.itemsTooLarge')}
            file={itemsFile}
            onChange={setItemsFile}
            label={t('externalInvoices.chooseFile')}
          />
          <p className="text-xs text-slate-500 mt-1">{t('externalInvoices.itemsHint')}</p>
          <Button type="link" className="p-0" icon={<DownloadOutlined />} onClick={downloadTemplate}>
            {t('externalInvoices.downloadTemplate')}
          </Button>
        </Form.Item>
        <Form.Item label={t('externalInvoices.file')} required>
          <FilePicker
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            maxBytes={RECEIPT_MAX_BYTES}
            tooLargeMessage={t('externalInvoices.receiptTooLarge')}
            file={receiptFile}
            onChange={setReceiptFile}
            label={t('externalInvoices.chooseFile')}
          />
          <p className="text-xs text-slate-500 mt-1">{t('externalInvoices.fileHint')}</p>
        </Form.Item>
        <Form.Item name="purchaseTotal" label={t('externalInvoices.purchaseTotal')} rules={requiredAmount}>
          <InputNumber className="w-full" min={0.01} precision={2} addonAfter="SYP" />
        </Form.Item>
        <Form.Item name="saleTotal" label={t('externalInvoices.saleTotal')} rules={requiredAmount}>
          <InputNumber className="w-full" min={0.01} precision={2} addonAfter="SYP" />
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
        title={t('externalInvoices.confirmTitle')}
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
              <Descriptions.Item label={t('externalInvoices.purchaseTotal')}>
                {formatSyp(pending.purchaseTotal)}
              </Descriptions.Item>
              <Descriptions.Item label={t('externalInvoices.saleTotal')}>
                <span className="font-semibold text-lg">{formatSyp(pending.saleTotal)}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t('externalInvoices.itemsFile')}>{itemsFile?.name}</Descriptions.Item>
              <Descriptions.Item label={t('externalInvoices.file')}>{receiptFile?.name}</Descriptions.Item>
            </Descriptions>
            {error ? (
              <Alert type="error" showIcon title={<span className="whitespace-pre-line">{error}</span>} />
            ) : (
              <Alert type="error" showIcon title={t('externalInvoices.confirmWarning')} />
            )}
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
