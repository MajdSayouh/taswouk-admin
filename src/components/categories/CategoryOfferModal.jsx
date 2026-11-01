import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button as AntButton, InputNumber, Modal, Select, Switch, Typography, message } from 'antd'
import * as productService from '../../services/productService.js'
import * as storeService from '../../services/storeService.js'
import { mapStoreFromApi } from '../../models/Store.js'
import { parseBulkOfferValue } from '../../utils/bulkOffer.js'
import { queryKeys } from '../../query/queryKeys.js'

function showSkipped(t, skipped) {
  if (!skipped.length) return
  // Named, with the server's reason, so nobody assumes every product changed.
  Modal.warning({
    title: t('products.list.bulkOfferSkippedTitle', { count: skipped.length }),
    width: 560,
    content: (
      <ul className="max-h-80 list-disc space-y-1 overflow-auto ps-5">
        {skipped.map((row) => (
          <li key={row.id}>
            <strong>{row.name || `#${row.id}`}</strong> — {row.reason}
          </li>
        ))}
      </ul>
    ),
  })
}

/**
 * Percentage offer on every product of one category, or removing those offers.
 * Open while `category` is set; the caller remounts it per category (a `key`),
 * which is what clears the fields.
 *
 * @param {{ category: { id: number | string, name: string } | null, onClose: () => void }} props
 */
export function CategoryOfferModal({ category, onClose }) {
  const { t } = useTranslation('pages')
  const queryClient = useQueryClient()
  const [raw, setRaw] = useState(/** @type {number | null} */ (null))
  const [storeId, setStoreId] = useState(/** @type {string | null} */ (null))
  const [includeSubcategories, setIncludeSubcategories] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [busy, setBusy] = useState(/** @type {'apply' | 'remove' | null} */ (null))

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: async ({ signal }) => {
      const list = await storeService.listStores({ signal })
      return Array.isArray(list) ? list.map(mapStoreFromApi) : []
    },
    enabled: category != null,
  })

  const run = async (action, percent) => {
    setBusy(action)
    try {
      const result = await productService.categoryOffer({
        categoryId: category.id,
        action,
        percent,
        storeId,
        includeSubcategories,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
      if (result.updated.length) {
        message.success(
          action === 'apply'
            ? t('categories.offerDone', { count: result.updated.length })
            : t('categories.offerRemoved', { count: result.updated.length }),
        )
      }
      showSkipped(t, result.skipped)
      onClose()
    } catch (e) {
      message.error(e?.message ?? t('products.list.bulkOfferError'))
    } finally {
      setBusy(null)
    }
  }

  const apply = () => {
    const percent = parseBulkOfferValue('percent', raw)
    if (percent == null) {
      setError(t('products.list.bulkOfferInvalidPercent'))
      return
    }
    run('apply', percent)
  }

  const remove = () => {
    Modal.confirm({
      title: t('categories.offerRemoveTitle'),
      content: t('categories.offerRemoveConfirm', { name: category?.name ?? '' }),
      okText: t('categories.offerRemove'),
      okButtonProps: { danger: true },
      cancelText: t('shared.cancel'),
      onOk: () => run('remove'),
    })
  }

  const stores = Array.isArray(storesQuery.data) ? storesQuery.data : []

  return (
    <Modal
      open={category != null}
      title={t('categories.offerTitle', { name: category?.name ?? '' })}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <AntButton key="remove" danger disabled={busy != null} loading={busy === 'remove'} onClick={remove}>
          {t('categories.offerRemove')}
        </AntButton>,
        <AntButton key="cancel" disabled={busy != null} onClick={onClose}>
          {t('shared.cancel')}
        </AntButton>,
        <AntButton key="apply" type="primary" disabled={busy != null} loading={busy === 'apply'} onClick={apply}>
          {t('products.list.bulkOfferApply')}
        </AntButton>,
      ]}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Typography.Text strong>{t('categories.offerPercent')}</Typography.Text>
          <InputNumber
            autoFocus
            className="mt-1 w-full"
            min={0}
            max={99.99}
            step={1}
            suffix="%"
            value={raw}
            status={error ? 'error' : undefined}
            onChange={(v) => {
              setRaw(v)
              setError(null)
            }}
            onPressEnter={apply}
          />
          <Typography.Text type={error ? 'danger' : 'secondary'} className="mt-1 block text-xs">
            {error ?? t('products.list.bulkOfferPercentHint')}
          </Typography.Text>
        </div>
        <div>
          <Typography.Text strong>{t('categories.offerStore')}</Typography.Text>
          <Select
            allowClear
            showSearch
            className="mt-1 w-full"
            placeholder={t('categories.offerAllStores')}
            loading={storesQuery.isLoading}
            value={storeId}
            onChange={(v) => setStoreId(v ?? null)}
            optionFilterProp="label"
            options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
          />
        </div>
        <label className="flex items-center gap-2">
          <Switch checked={includeSubcategories} onChange={setIncludeSubcategories} />
          <span>{t('categories.offerIncludeSubcategories')}</span>
        </label>
        <Alert type="info" showIcon title={t('products.list.bulkOfferNote')} />
      </div>
    </Modal>
  )
}
