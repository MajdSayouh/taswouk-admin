// Product variants — GET/POST/PATCH/DELETE /api/products/{id}/variants (per color/size price).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { InfoCircleOutlined } from '@ant-design/icons'
import {
  Alert,
  AutoComplete,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd'
import * as productService from '../../services/productService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { Card } from '../ui/Card.jsx'
import { Button } from '../ui/Button.jsx'
import { TableRowActions } from '../tables/TableRowActions.jsx'
import { DASHBOARD_TABLE_PROPS } from '../tables/tableDefaults.js'
import { PRODUCT_SIZE_OPTIONS } from '../../views/products/ProductEditorForm.jsx'
import {
  normalizeVariantList,
  dedupeVariantListById,
  variantComparePriceForApi,
  resolveVariantApiPrice,
  resolveVariantApiComparePrice,
  variantStockQuantityForApi,
  attrByKey,
  firstNonEmpty,
  buildVariantAttributes,
  emptyCustomAttribute,
  resolveCustomAttributeKey,
  validateCustomAttributes,
  OPTION_ERROR_MESSAGE_KEYS,
  CUSTOM_ATTRIBUTE_PRESETS,
  mapApiVariantToRow,
  reconcileVariantColorsWithProductOptions,
} from '../../utils/productVariants.js'

function commaSplit(s) {
  if (s == null || String(s).trim() === '') return []
  return String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function normalizeColorList(raw) {
  if (Array.isArray(raw)) return raw.map((c) => String(c).trim()).filter(Boolean)
  return commaSplit(raw)
}

function normalizeSizeList(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  return commaSplit(raw)
}

function sortVariantAttributes(attrs) {
  if (!Array.isArray(attrs)) return []
  return [...attrs].sort((a, b) => {
    const sa = Number(a?.sort_order ?? a?.sortOrder ?? 0)
    const sb = Number(b?.sort_order ?? b?.sortOrder ?? 0)
    if (sa !== sb) return sa - sb
    const ka = String(a?.attribute_key ?? a?.key ?? '')
    const kb = String(b?.attribute_key ?? b?.key ?? '')
    return ka.localeCompare(kb)
  })
}

function formatVariantSummary(attrs) {
  const sorted = sortVariantAttributes(attrs)
  return sorted
    .map((a) => {
      const k = firstNonEmpty(a?.attribute_key_ar, a?.attribute_key, a?.key)
      const v = firstNonEmpty(a?.value_ar, a?.value_en, a?.value)
      if (!k && !v) return ''
      return `${k}: ${v}`.trim()
    })
    .filter(Boolean)
    .join(' · ')
}

/** Custom attributes only (everything beyond the fixed color/size fields), as `key: value · key: value`. */
function formatCustomAttrsSummary(attrs) {
  const sorted = sortVariantAttributes(attrs).filter((a) => {
    const key = String(a?.attribute_key ?? a?.key ?? '')
    return key !== 'color' && key !== 'size'
  })
  return sorted
    .map((a) => {
      const k = firstNonEmpty(a?.attribute_key_ar, a?.attribute_key, a?.key)
      const v = firstNonEmpty(a?.value_ar, a?.value_en, a?.value)
      if (!k && !v) return ''
      return `${k}: ${v}`.trim()
    })
    .filter(Boolean)
    .join(' · ')
}

const VARIANT_STATUS_OPTIONS = ['active', 'inactive', 'out_of_stock']

/**
 * @param {{
 *   productId: string | number
 *   product?: Record<string, unknown> | null
 *   readOnly?: boolean
 * }} props
 */
export function ProductVariantsPanel({ productId, product = null, readOnly = false }) {
  const { t } = useTranslation('pages')
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [editing, setEditing] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const [deletingId, setDeletingId] = useState(/** @type {string | number | null} */ (null))
  const [addCustomAttrs, setAddCustomAttrs] = useState(/** @type {{ key: string, name: string, value: string }[]} */ ([]))
  const addOffer = Form.useWatch('is_offer', addForm)
  const editOffer = Form.useWatch('is_offer', editForm)

  const optionPresetOptions = useMemo(
    () => CUSTOM_ATTRIBUTE_PRESETS.map((p) => ({ value: p.ar, label: `${p.ar} / ${p.en}` })),
    [],
  )

  const colorSuggestions = useMemo(() => {
    const list = normalizeColorList(product?.colors)
    return list.map((c) => ({ value: c }))
  }, [product])

  const sizeSelectOptions = useMemo(() => {
    // "ستاندر"/"Standard" is kept as a normal, pickable, savable size here — see
    // buildVariantAttributes/isBarePlaceholderVariantRow in productVariants.js for why picking it
    // no longer gets silently dropped on save.
    const allowed = normalizeSizeList(product?.size ?? product?.sizes)
    if (allowed.length > 0) return allowed.map((s) => ({ label: s, value: s }))
    return PRODUCT_SIZE_OPTIONS
  }, [product])

  const variantsQuery = useQuery({
    queryKey: queryKeys.products.variants(productId),
    queryFn: async () => {
      const data = await productService.listProductVariants(productId)
      return dedupeVariantListById(normalizeVariantList(data))
    },
    enabled: productId != null && productId !== '',
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.variants(productId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) })
  }

  const createMut = useMutation({
    mutationFn: ({ createPayload, initialStatus }) =>
      productService.createProductVariantWithInitialStatus(productId, createPayload, {
        status: initialStatus,
      }),
    onSuccess: () => {
      message.success(t('products.variants.created'))
      setAddOpen(false)
      addForm.resetFields()
      setAddCustomAttrs([])
      invalidate()
    },
    onError: (err) => {
      message.error(err?.message ?? t('products.variants.createErr'))
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ variantId, payload }) =>
      productService.updateProductVariant(productId, variantId, payload),
    onSuccess: () => {
      message.success(t('products.variants.updated'))
      setEditOpen(false)
      setEditing(null)
      editForm.resetFields()
      invalidate()
    },
    onError: (err) => {
      message.error(err?.message ?? t('products.variants.updateErr'))
    },
  })

  const deleteMut = useMutation({
    mutationFn: (variantId) =>
      productService.deleteProductVariant(Number(productId), Number(variantId)),
    onSuccess: () => {
      message.success(t('products.variants.deleted'))
      invalidate()
    },
    onError: (err) => {
      message.error(err?.message ?? t('products.variants.deleteErr'))
    },
    onSettled: () => setDeletingId(null),
  })

  const rows = useMemo(() => variantsQuery.data ?? [], [variantsQuery.data])
  const displayColorsByVariantId = useMemo(() => {
    const mappedRows = rows.map((variant) => mapApiVariantToRow(variant, 'en'))
    const displayRows = reconcileVariantColorsWithProductOptions(
      mappedRows,
      normalizeColorList(product?.colors),
    )
    return new Map(
      displayRows
        .filter((row) => row.variantId != null)
        .map((row) => [String(row.variantId), row.color]),
    )
  }, [rows, product])

  function displayColorForVariant(row) {
    return displayColorsByVariantId.get(String(row?.id)) || attrByKey(row?.attributes, 'color')
  }

  function openAdd() {
    addForm.setFieldsValue({
      color: '',
      size: '',
      price: undefined,
      compare_price: undefined,
      sku: '',
      stock_quantity: undefined,
      is_offer: false,
      status: 'active',
    })
    setAddCustomAttrs([])
    setAddOpen(true)
  }

  function addCustomAttrRow() {
    setAddCustomAttrs((prev) => [...prev, emptyCustomAttribute()])
  }

  function updateCustomAttrRow(key, patch) {
    setAddCustomAttrs((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
  }

  function removeCustomAttrRow(key) {
    setAddCustomAttrs((prev) => prev.filter((a) => a.key !== key))
  }

  function openEdit(row) {
    setEditing(row)
    // Inverse of resolveVariantApiPrice/resolveVariantApiComparePrice: on offer, the API's `price`
    // is the discounted charge and `compare_price` is the regular reference price — opposite of
    // this form's "Price" (regular) / "Offer price" (discounted) fields, so swap back for display.
    const isOffer = Boolean(row.is_offer)
    const regularPrice = isOffer && row.compare_price != null ? row.compare_price : row.price
    const offerPrice = isOffer && row.compare_price != null ? row.price : null
    editForm.setFieldsValue({
      price: regularPrice != null ? Number(regularPrice) : undefined,
      compare_price: offerPrice != null ? Number(offerPrice) : undefined,
      sku: row.sku ?? '',
      stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : undefined,
      is_offer: Boolean(row.is_offer),
      status: row.status && VARIANT_STATUS_OPTIONS.includes(row.status) ? row.status : 'active',
    })
    setEditOpen(true)
  }

  function handleAddSubmit() {
    addForm.validateFields().then((v) => {
      const color = String(v.color ?? '').trim()
      const size = String(v.size ?? '').trim()

      const optionError = validateCustomAttributes(addCustomAttrs)
      if (optionError) {
        message.error(t(OPTION_ERROR_MESSAGE_KEYS[optionError]))
        return
      }
      const attributes = buildVariantAttributes({ color, size, customAttributes: addCustomAttrs })

      const enteredPrice = Number(v.price)
      if (!Number.isFinite(enteredPrice) || enteredPrice <= 0) {
        message.error(t('products.variants.priceInvalid'))
        return
      }

      const offerPriceRow = { is_offer: v.is_offer, compare_price: v.compare_price }
      if (Boolean(v.is_offer) && variantComparePriceForApi(offerPriceRow) == null) {
        message.error(t('products.variants.offerPriceRequired'))
        return
      }
      // See resolveVariantApiPrice's doc: on offer, price/compare_price swap for the API.
      const pricingRow = { is_offer: v.is_offer, price: v.price, compare_price: v.compare_price }
      const price = resolveVariantApiPrice(pricingRow)
      const compare_price = resolveVariantApiComparePrice(pricingRow)

      const stockQuantity = variantStockQuantityForApi({ stock_quantity: v.stock_quantity })

      createMut.mutate({
        createPayload: {
          price,
          compare_price,
          sku: String(v.sku ?? '').trim() || null,
          is_offer: Boolean(v.is_offer),
          ...(stockQuantity != null ? { stock_quantity: stockQuantity } : {}),
          attributes,
        },
        initialStatus:
          v.status && VARIANT_STATUS_OPTIONS.includes(v.status) ? v.status : 'active',
      })
    })
  }

  function handleEditSubmit() {
    editForm.validateFields().then((v) => {
      if (!editing?.id) return
      const enteredPrice = Number(v.price)
      if (!Number.isFinite(enteredPrice) || enteredPrice <= 0) {
        message.error(t('products.variants.priceInvalid'))
        return
      }

      const offerPriceRow = { is_offer: v.is_offer, compare_price: v.compare_price }
      if (Boolean(v.is_offer) && variantComparePriceForApi(offerPriceRow) == null) {
        message.error(t('products.variants.offerPriceRequired'))
        return
      }
      // See resolveVariantApiPrice's doc: on offer, price/compare_price swap for the API.
      const pricingRow = { is_offer: v.is_offer, price: v.price, compare_price: v.compare_price }
      const price = resolveVariantApiPrice(pricingRow)
      const compare_price = resolveVariantApiComparePrice(pricingRow)

      const stockQuantity = variantStockQuantityForApi({ stock_quantity: v.stock_quantity })

      updateMut.mutate({
        variantId: editing.id,
        payload: {
          price,
          compare_price,
          sku: String(v.sku ?? '').trim() || null,
          is_offer: Boolean(v.is_offer),
          ...(stockQuantity != null ? { stock_quantity: stockQuantity } : {}),
          status:
            v.status && VARIANT_STATUS_OPTIONS.includes(v.status) ? v.status : 'active',
        },
      })
    })
  }

  const columns = [
    {
      title: t('products.variants.color'),
      key: 'color',
      width: 140,
      render: (_, row) => {
        const color = displayColorForVariant(row)
        if (!color) return '—'
        return (
          <span className="inline-flex items-center gap-2 text-slate-800">
            <span
              className="inline-block h-4 w-4 shrink-0 rounded border border-slate-300"
              style={{ backgroundColor: /^#/i.test(color) ? color : '#ccc' }}
              aria-hidden
            />
            {color}
          </span>
        )
      },
    },
    {
      title: t('products.variants.size'),
      key: 'size',
      width: 90,
      render: (_, row) => attrByKey(row.attributes, 'size') || '—',
    },
    {
      title: t('products.variants.attrs'),
      key: 'options',
      render: (_, row) => (
        <span className="text-slate-800 whitespace-normal max-w-[220px] inline-block">
          {formatCustomAttrsSummary(row.attributes) || '—'}
        </span>
      ),
    },
    {
      title: t('products.variants.colImages'),
      key: 'variantImages',
      width: 72,
      render: (_, row) => {
        const n = Array.isArray(row.images) ? row.images.length : 0
        return <span className="tabular-nums text-slate-700">{n > 0 ? n : '—'}</span>
      },
    },
    {
      title: t('products.variants.stock'),
      dataIndex: 'stock_quantity',
      width: 90,
      render: (q) => <span className="tabular-nums">{q != null ? Number(q) : '—'}</span>,
    },
    {
      title: t('products.variants.price'),
      dataIndex: 'price',
      width: 110,
      render: (p) => (
        <span className="tabular-nums">{p != null ? Number(p).toFixed(2) : '—'}</span>
      ),
    },
    {
      title: t('products.variants.comparePrice'),
      dataIndex: 'compare_price',
      width: 130,
      render: (cp) => (
        <span className="tabular-nums">
          {cp != null && cp !== '' ? Number(cp).toFixed(2) : '—'}
        </span>
      ),
    },
    {
      title: t('products.variants.sku'),
      dataIndex: 'sku',
      width: 120,
      ellipsis: true,
      render: (s) => s || '—',
    },
    {
      title: t('products.variants.offer'),
      dataIndex: 'is_offer',
      width: 88,
      render: (o) =>
        o ? <Tag color="orange">{t('shared.yes')}</Tag> : <Tag>{t('shared.no')}</Tag>,
    },
    {
      title: t('products.variants.status'),
      dataIndex: 'status',
      width: 120,
      render: (st) => {
        if (st === 'active') return <Tag color="green">{t('products.variants.statusActive')}</Tag>
        if (st === 'out_of_stock')
          return <Tag color="red">{t('products.variants.statusOutOfStock')}</Tag>
        return <Tag>{t('products.variants.statusInactive')}</Tag>
      },
    },
    ...(!readOnly
      ? [
          {
            title: t('products.variants.actions'),
            key: 'actions',
            width: 200,
            fixed: 'right',
            render: (_, row) => (
              <TableRowActions
                showEdit
                onEdit={() => openEdit(row)}
                showDelete
                onDelete={() => {
                  setDeletingId(row.id)
                  deleteMut.mutate(row.id)
                }}
                deleteTitle={t('products.variants.deleteTitle')}
                deleteDescription={t('products.variants.deleteDesc')}
                deleteLoading={deletingId === row.id && deleteMut.isPending}
              />
            ),
          },
        ]
      : []),
  ]

  if (variantsQuery.isLoading) {
    return (
      <Card title={t('products.variants.cardTitle')}>
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      </Card>
    )
  }

  if (variantsQuery.isError) {
    return (
      <Card title={t('products.variants.cardTitle')}>
        <Alert type="error" title={variantsQuery.error?.message ?? t('products.variants.loadError')} />
      </Card>
    )
  }

  return (
    <Card
      title={t('products.variants.cardTitle')}
      extra={
        readOnly ? null : (
          <Button type="button" onClick={openAdd}>
            {t('products.variants.add')}
          </Button>
        )
      }
    >
      {!readOnly ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
          <Tooltip title={t('products.variants.attrNote')}>
            <button
              type="button"
              className="mt-0.5 shrink-0 rounded p-0.5 text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#FF7D29]"
              aria-label={t('products.variants.attrNote')}
            >
              <InfoCircleOutlined aria-hidden />
            </button>
          </Tooltip>
          <span>{t('products.variants.attrNoteShort')}</span>
        </div>
      ) : null}

      <Table
        {...DASHBOARD_TABLE_PROPS}
        rowKey={(r) => String(r.id)}
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: t('products.variants.empty') }}
      />

      <Modal
        title={t('products.variants.createTitle')}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleAddSubmit}
        confirmLoading={createMut.isPending}
        destroyOnClose
        okText={t('products.variants.save')}
        cancelText={t('shared.cancel')}
      >
        <Form form={addForm} layout="vertical" className="pt-2">
          <Form.Item
            name="color"
            label={t('products.variants.color')}
            extra={t('products.variants.colorHint')}
          >
            <AutoComplete
              options={colorSuggestions}
              placeholder={t('products.variants.colorPh')}
              allowClear
            />
          </Form.Item>
          <Form.Item name="size" label={t('products.variants.size')}>
            <AutoComplete
              allowClear
              filterOption={(input, option) =>
                String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
              }
              placeholder={t('products.variants.sizePh')}
              options={sizeSelectOptions}
            />
          </Form.Item>

          <div className="mb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">
                {t('products.variants.optionsTitle')}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="!px-2 !py-1 !text-xs"
                onClick={addCustomAttrRow}
              >
                {t('products.variants.addOption')}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('products.variants.optionsHint')}
            </p>
            {addCustomAttrs.length > 0 ? (
              <div className="mt-2 space-y-2">
                {addCustomAttrs.map((attr) => {
                  const resolvedKey = resolveCustomAttributeKey(attr.name)
                  const invalidKey = String(attr.name ?? '').trim() !== '' && !resolvedKey
                  const duplicateKey =
                    resolvedKey !== '' &&
                    addCustomAttrs.filter((a) => resolveCustomAttributeKey(a.name) === resolvedKey)
                      .length > 1
                  return (
                    <div key={attr.key} className="flex flex-wrap items-start gap-2">
                      <div className="min-w-[120px] flex-1 basis-[120px]">
                        <AutoComplete
                          className="w-full"
                          options={optionPresetOptions}
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                            (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          placeholder={t('products.variants.optionNamePh')}
                          status={invalidKey || duplicateKey ? 'error' : undefined}
                          value={attr.name}
                          onChange={(v) => updateCustomAttrRow(attr.key, { name: v ?? '' })}
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
                        <Input
                          placeholder={t('products.variants.optionValuePh')}
                          value={attr.value}
                          onChange={(e) => updateCustomAttrRow(attr.key, { value: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 !text-xs !text-rose-600 hover:!bg-rose-50"
                        onClick={() => removeCustomAttrRow(attr.key)}
                      >
                        {t('products.variants.removeOption')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>

          <Form.Item
            name="price"
            label={t('products.variants.price')}
            rules={[{ required: true, message: t('products.variants.priceRequired') }]}
          >
            <InputNumber min={0.01} step={0.01} className="w-full" />
          </Form.Item>
          <Form.Item name="sku" label={t('products.variants.sku')}>
            <Input allowClear />
          </Form.Item>
          <Form.Item name="stock_quantity" label={t('products.variants.stock')}>
            <InputNumber min={0} step={1} className="w-full" />
          </Form.Item>
          <Form.Item name="is_offer" label={t('products.variants.onOffer')} valuePropName="checked">
            <Switch />
          </Form.Item>
          {addOffer ? (
            <Form.Item
              name="compare_price"
              label={t('products.variants.offerPriceField')}
              rules={[{ required: true, message: t('products.variants.offerPriceRequired') }]}
              extra={t('products.variants.offerPriceHint')}
            >
              <InputNumber min={0.01} step={0.01} className="w-full" />
            </Form.Item>
          ) : null}
          <Form.Item name="status" label={t('products.variants.status')}>
            <Select
              options={VARIANT_STATUS_OPTIONS.map((s) => ({
                value: s,
                label:
                  s === 'active'
                    ? t('products.variants.statusActive')
                    : s === 'out_of_stock'
                      ? t('products.variants.statusOutOfStock')
                      : t('products.variants.statusInactive'),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('products.variants.editTitle')}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false)
          setEditing(null)
        }}
        onOk={handleEditSubmit}
        confirmLoading={updateMut.isPending}
        destroyOnClose
        okText={t('products.variants.save')}
        cancelText={t('shared.cancel')}
      >
        {editing ? (
          <div className="mb-3 text-sm text-slate-600">
            {formatVariantSummary(editing.attributes) || '—'}
          </div>
        ) : null}
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="price"
            label={t('products.variants.price')}
            rules={[{ required: true, message: t('products.variants.priceRequired') }]}
          >
            <InputNumber min={0.01} step={0.01} className="w-full" />
          </Form.Item>
          <Form.Item name="sku" label={t('products.variants.sku')}>
            <Input allowClear />
          </Form.Item>
          <Form.Item name="stock_quantity" label={t('products.variants.stock')}>
            <InputNumber min={0} step={1} className="w-full" />
          </Form.Item>
          <Form.Item name="is_offer" label={t('products.variants.onOffer')} valuePropName="checked">
            <Switch />
          </Form.Item>
          {editOffer ? (
            <Form.Item
              name="compare_price"
              label={t('products.variants.offerPriceField')}
              rules={[{ required: true, message: t('products.variants.offerPriceRequired') }]}
              extra={t('products.variants.offerPriceHint')}
            >
              <InputNumber min={0.01} step={0.01} className="w-full" />
            </Form.Item>
          ) : null}
          <Form.Item name="status" label={t('products.variants.status')}>
            <Select
              options={VARIANT_STATUS_OPTIONS.map((s) => ({
                value: s,
                label:
                  s === 'active'
                    ? t('products.variants.statusActive')
                    : s === 'out_of_stock'
                      ? t('products.variants.statusOutOfStock')
                      : t('products.variants.statusInactive'),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
