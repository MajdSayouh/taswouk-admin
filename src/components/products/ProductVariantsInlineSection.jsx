// Inline variant prices inside product create/edit — color, optional size, price per row (no modals).
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AutoComplete, InputNumber, Select, Switch, message } from 'antd'
import { Button } from '../ui/Button.jsx'
import { PRODUCT_SIZE_OPTIONS } from '../../views/products/ProductEditorForm.jsx'
import {
  VARIANT_STATUS_VALUES,
  CUSTOM_ATTRIBUTE_PRESETS,
  emptyVariantRow,
  emptyCustomAttribute,
  resolveCustomAttributeKey,
} from '../../utils/productVariants.js'
import { VariantRowImagesField } from './VariantRowImagesField.jsx'

/**
 * @param {{
 *   variantRows: Array<ReturnType<typeof emptyVariantRow>>
 *   setVariantRows: React.Dispatch<React.SetStateAction<Array<ReturnType<typeof emptyVariantRow>>>
 *   productColors: string[]
 *   productSizes: string[]
 *   showStatusColumn?: boolean
 *   lockExistingAttributes?: boolean — when true, rows with variantId cannot change color/size (API)
 *   productId?: string | number | null — for authenticated image previews on edit
 *   onPersistedVariantRemove?: (row: ReturnType<typeof emptyVariantRow>) => Promise<void> — e.g. DELETE variant on edit page
 *   onCommitVariantStatus?: (variantId: string | number, status: string) => Promise<void> — PATCH status immediately (edit product only)
 * }} props
 */
export function ProductVariantsInlineSection({
  variantRows,
  setVariantRows,
  productColors,
  productSizes,
  showStatusColumn = false,
  lockExistingAttributes = false,
  productId = null,
  onPersistedVariantRemove,
  onCommitVariantStatus,
}) {
  const { t, i18n } = useTranslation('pages')
  const optionPresetOptions = CUSTOM_ATTRIBUTE_PRESETS.map((p) => ({
    value: i18n.language?.startsWith('ar') ? p.ar : p.en,
    label: `${p.ar} / ${p.en}`,
  }))
  const [removingRowKey, setRemovingRowKey] = useState(/** @type {string | null} */ (null))
  const [statusSavingKey, setStatusSavingKey] = useState(/** @type {string | null} */ (null))

  const colorAutocompleteOptions = (Array.isArray(productColors) ? productColors : []).map(
    (c) => ({
      value: c,
      label: (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 shrink-0 rounded border border-slate-300"
            style={{ backgroundColor: /^#/i.test(String(c)) ? c : '#ccc' }}
            aria-hidden
          />
          {c}
        </span>
      ),
    }),
  )

  const sizeOpts =
    Array.isArray(productSizes) && productSizes.length > 0
      ? productSizes.map((s) => ({ label: s, value: s }))
      : PRODUCT_SIZE_OPTIONS

  function updateRow(key, patch) {
    setVariantRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
  }

  async function removeRow(key) {
    const row = variantRows.find((r) => r.key === key)
    if (!row) return
    if (row.variantId != null && onPersistedVariantRemove) {
      setRemovingRowKey(key)
      try {
        await onPersistedVariantRemove(row)
      } catch {
        return
      } finally {
        setRemovingRowKey(null)
      }
    }
    setVariantRows((prev) => prev.filter((r) => r.key !== key))
  }

  function addRow() {
    setVariantRows((prev) => [...prev, emptyVariantRow()])
  }

  function addCustomAttribute(rowKey) {
    setVariantRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? { ...row, customAttributes: [...(row.customAttributes || []), emptyCustomAttribute()] }
          : row,
      ),
    )
  }

  function updateCustomAttribute(rowKey, attrKey, patch) {
    setVariantRows((prev) =>
      prev.map((row) => {
        if (row.key !== rowKey) return row
        return {
          ...row,
          customAttributes: (row.customAttributes || []).map((a) =>
            a.key === attrKey ? { ...a, ...patch } : a,
          ),
        }
      }),
    )
  }

  function removeCustomAttribute(rowKey, attrKey) {
    setVariantRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? { ...row, customAttributes: (row.customAttributes || []).filter((a) => a.key !== attrKey) }
          : row,
      ),
    )
  }

  function removeExistingImage(rowKey, index) {
    setVariantRows((prev) =>
      prev.map((row) => {
        if (row.key !== rowKey) return row
        const paths = [...(row.existingImagePaths || [])]
        paths.splice(index, 1)
        return { ...row, existingImagePaths: paths }
      }),
    )
  }

  function addImageFiles(rowKey, fileList) {
    const picked = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!picked.length) return
    setVariantRows((prev) =>
      prev.map((row) => {
        if (row.key !== rowKey) return row
        const cur = [...(row.imageFiles || [])]
        return { ...row, imageFiles: [...cur, ...picked] }
      }),
    )
  }

  function removeNewImageFile(rowKey, index) {
    setVariantRows((prev) =>
      prev.map((row) => {
        if (row.key !== rowKey) return row
        const cur = [...(row.imageFiles || [])]
        cur.splice(index, 1)
        return { ...row, imageFiles: cur }
      }),
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {t('products.variants.inlineTitle')}
        </h3>
        <p className="text-xs text-slate-500 mt-1">{t('products.variants.inlineHint')}</p>
        {lockExistingAttributes ? (
          <p className="text-xs text-amber-800/90 mt-1">{t('products.variants.inlineLockAttrs')}</p>
        ) : null}
      </div>

      {variantRows.length === 0 ? (
        <p className="text-sm text-slate-500">{t('products.variants.inlineEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {variantRows.map((row) => {
            const attrsLocked = Boolean(lockExistingAttributes && row.variantId)
            return (
            <div
              key={row.key}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex flex-wrap gap-x-3 gap-y-3 items-end">
                <div className="min-w-[200px] flex-1 basis-[200px]">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('products.variants.color')}
                  </label>
                  <AutoComplete
                    className="w-full"
                    options={colorAutocompleteOptions}
                    placeholder={t('products.variants.inlineColorPh')}
                    allowClear
                    disabled={attrsLocked}
                    value={row.color || undefined}
                    onChange={(v) => updateRow(row.key, { color: v != null ? String(v) : '' })}
                  />
                  {!productColors?.length ? (
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {t('products.variants.inlineAddColorsFirst')}
                    </p>
                  ) : null}
                </div>
                <div className="w-[130px] shrink-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('products.variants.size')}
                  </label>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t('products.variants.sizePh')}
                    className="w-full"
                    size="middle"
                    disabled={attrsLocked}
                    options={sizeOpts}
                    value={row.size || undefined}
                    onChange={(v) => updateRow(row.key, { size: v != null ? String(v) : '' })}
                  />
                </div>
                <div className="w-[120px] shrink-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('products.variants.price')} *
                  </label>
                  <InputNumber
                    min={0.01}
                    step={0.01}
                    className="w-full"
                    value={row.price === '' ? null : Number(row.price)}
                    onChange={(v) =>
                      updateRow(row.key, {
                        price: v != null && v !== '' ? String(v) : '',
                      })
                    }
                  />
                </div>
                <div className="min-w-[120px] w-[140px] shrink-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('products.variants.sku')}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    value={row.sku}
                    onChange={(e) => updateRow(row.key, { sku: e.target.value })}
                  />
                </div>
                <div className="w-[110px] shrink-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('products.variants.stock')}
                  </label>
                  <InputNumber
                    min={0}
                    step={1}
                    className="w-full"
                    value={row.stock_quantity === '' ? null : Number(row.stock_quantity)}
                    onChange={(v) =>
                      updateRow(row.key, {
                        stock_quantity: v != null && v !== '' ? String(v) : '',
                      })
                    }
                  />
                </div>
                {showStatusColumn ? (
                  <div className="w-[150px] shrink-0">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('products.variants.status')}
                    </label>
                    <Select
                      className="w-full"
                      size="middle"
                      value={row.status}
                      disabled={statusSavingKey === row.key}
                      onChange={async (v) => {
                        const prev = row.status
                        updateRow(row.key, { status: v })
                        if (row.variantId == null || !onCommitVariantStatus) return
                        setStatusSavingKey(row.key)
                        try {
                          await onCommitVariantStatus(row.variantId, v)
                        } catch {
                          updateRow(row.key, { status: prev })
                          message.error(t('products.variants.updateErr'))
                        } finally {
                          setStatusSavingKey(null)
                        }
                      }}
                      // out_of_stock is server-managed (set automatically when stock_quantity
                      // hits 0) — admins only ever choose between active/inactive. It's still
                      // included, disabled, when it's the row's current status so the Select can
                      // display it without offering it as something to pick.
                      options={VARIANT_STATUS_VALUES.filter(
                        (s) => s !== 'out_of_stock' || row.status === 'out_of_stock',
                      ).map((s) => ({
                        value: s,
                        disabled: s === 'out_of_stock',
                        label:
                          s === 'active'
                            ? t('products.variants.statusActive')
                            : s === 'out_of_stock'
                              ? t('products.variants.statusOutOfStock')
                              : t('products.variants.statusInactive'),
                      }))}
                    />
                  </div>
                ) : null}
                <div className="flex items-center gap-2 pb-0.5 shrink-0">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 whitespace-nowrap">
                    <Switch
                      checked={row.is_offer}
                      onChange={(c) =>
                        updateRow(
                          row.key,
                          c ? { is_offer: true } : { is_offer: false, compare_price: '' },
                        )
                      }
                    />
                    {t('products.variants.onOffer')}
                  </label>
                </div>
                <div className="ml-auto shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="!text-rose-600 hover:!bg-rose-50"
                    disabled={removingRowKey != null}
                    onClick={() => removeRow(row.key)}
                  >
                    {t('products.variants.inlineRemove')}
                  </Button>
                </div>
              </div>

              {row.is_offer ? (
                <div className="mt-3 w-full max-w-xs">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('products.variants.offerPriceField')} *
                  </label>
                  <InputNumber
                    min={0.01}
                    step={0.01}
                    className="w-full"
                    value={row.compare_price === '' ? null : Number(row.compare_price)}
                    onChange={(v) =>
                      updateRow(row.key, {
                        compare_price: v != null && v !== '' ? String(v) : '',
                      })
                    }
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t('products.variants.offerPriceHint')}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-medium text-slate-600">
                    {t('products.variants.optionsTitle')}
                  </label>
                  {!attrsLocked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2 !py-1 !text-xs"
                      onClick={() => addCustomAttribute(row.key)}
                    >
                      {t('products.variants.addOption')}
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('products.variants.optionsHint')}
                </p>
                {Array.isArray(row.customAttributes) && row.customAttributes.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {row.customAttributes.map((attr) => {
                      const resolvedKey = resolveCustomAttributeKey(attr.name)
                      const invalidKey = String(attr.name ?? '').trim() !== '' && !resolvedKey
                      const duplicateKey =
                        resolvedKey !== '' &&
                        row.customAttributes.filter(
                          (a) => resolveCustomAttributeKey(a.name) === resolvedKey,
                        ).length > 1
                      return (
                        <div key={attr.key} className="flex flex-wrap items-start gap-2">
                          <div className="min-w-[120px] flex-1 basis-[120px]">
                            <AutoComplete
                              className="w-full"
                              disabled={attrsLocked}
                              options={optionPresetOptions}
                              filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                                (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                              }
                              placeholder={t('products.variants.optionNamePh')}
                              status={invalidKey || duplicateKey ? 'error' : undefined}
                              value={attr.name}
                              onChange={(v) =>
                                updateCustomAttribute(row.key, attr.key, { name: v ?? '' })
                              }
                            />
                            {invalidKey ? (
                              <p className="text-[11px] text-rose-600 mt-0.5">
                                {t('products.variants.optionInvalidKey')}
                              </p>
                            ) : duplicateKey ? (
                              <p className="text-[11px] text-rose-600 mt-0.5">
                                {t('products.variants.optionDuplicateKey')}
                              </p>
                            ) : null}
                          </div>
                          <div className="min-w-[120px] flex-1 basis-[120px]">
                            <input
                              type="text"
                              disabled={attrsLocked}
                              placeholder={t('products.variants.optionValuePh')}
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                              value={attr.value}
                              onChange={(e) =>
                                updateCustomAttribute(row.key, attr.key, { value: e.target.value })
                              }
                            />
                          </div>
                          {!attrsLocked ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="!px-2 !py-1 !text-xs !text-rose-600 hover:!bg-rose-50"
                              onClick={() => removeCustomAttribute(row.key, attr.key)}
                            >
                              {t('products.variants.removeOption')}
                            </Button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <VariantRowImagesField
                rowKey={row.key}
                productId={productId}
                existingImagePaths={row.existingImagePaths ?? []}
                imageFiles={row.imageFiles ?? []}
                onRemoveExisting={(idx) => removeExistingImage(row.key, idx)}
                onAddFiles={(list) => addImageFiles(row.key, list)}
                onRemoveNewFile={(idx) => removeNewImageFile(row.key, idx)}
              />
            </div>
            )
          })}
        </div>
      )}

      <Button type="button" variant="secondary" onClick={addRow}>
        {t('products.variants.inlineAddRow')}
      </Button>
    </div>
  )
}
