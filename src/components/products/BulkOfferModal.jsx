import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, InputNumber, Modal, Segmented, Typography } from 'antd'
import { parseBulkOfferValue } from '../../utils/bulkOffer.js'

/**
 * Asks for the discount rule — percent or fixed amount, and the figure — for the
 * selected products. Calls `onSubmit(type, value)`; the caller does the request.
 * The caller remounts it per opening (a `key`), which is what clears the fields.
 *
 * @param {{ open: boolean, count: number, loading?: boolean, onCancel: () => void, onSubmit: (type: 'percent' | 'amount', value: number) => void }} props
 */
export function BulkOfferModal({ open, count, loading = false, onCancel, onSubmit }) {
  const { t } = useTranslation('pages')
  const [type, setType] = useState(/** @type {'percent' | 'amount'} */ ('percent'))
  const [raw, setRaw] = useState(/** @type {number | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const submit = () => {
    const value = parseBulkOfferValue(type, raw)
    if (value == null) {
      setError(
        type === 'percent'
          ? t('products.list.bulkOfferInvalidPercent')
          : t('products.list.bulkOfferInvalidAmount'),
      )
      return
    }
    onSubmit(type, value)
  }

  return (
    <Modal
      open={open}
      title={t('products.list.bulkOfferTitle', { count })}
      okText={t('products.list.bulkOfferApply')}
      cancelText={t('shared.cancel')}
      onOk={submit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
    >
      <div className="flex flex-col gap-4">
        <Segmented
          block
          value={type}
          onChange={(v) => {
            setType(/** @type {'percent' | 'amount'} */ (v))
            setError(null)
          }}
          options={[
            { value: 'percent', label: t('products.list.bulkOfferPercent') },
            { value: 'amount', label: t('products.list.bulkOfferAmount') },
          ]}
        />
        <div>
          <Typography.Text strong>{t('products.list.bulkOfferValue')}</Typography.Text>
          <InputNumber
            autoFocus
            className="mt-1 w-full"
            min={0}
            max={type === 'percent' ? 99.99 : undefined}
            step={type === 'percent' ? 1 : 100}
            suffix={type === 'percent' ? '%' : undefined}
            value={raw}
            status={error ? 'error' : undefined}
            onChange={(v) => {
              setRaw(v)
              setError(null)
            }}
            onPressEnter={submit}
          />
          <Typography.Text type={error ? 'danger' : 'secondary'} className="mt-1 block text-xs">
            {error ??
              (type === 'percent'
                ? t('products.list.bulkOfferPercentHint')
                : t('products.list.bulkOfferAmountHint'))}
          </Typography.Text>
        </div>
        <Alert type="info" showIcon title={t('products.list.bulkOfferNote')} />
      </div>
    </Modal>
  )
}
