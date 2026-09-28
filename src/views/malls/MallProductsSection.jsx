// Mall edit: the mall's own products — create, price, stock, availability.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Form, Input, InputNumber, Modal, Select, Spin, Switch, Table, message } from 'antd'
import * as mallService from '../../services/mallService.js'
import { useMallProductsViewModel } from '../../viewmodels/useMallProductsViewModel.js'
import { useMallCategoriesViewModel } from '../../viewmodels/useMallCategoriesViewModel.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { PriceSheetActions } from '../../components/prices/PriceSheetActions.jsx'
import {
  DASHBOARD_TABLE_PROPS,
  DEFAULT_PAGE_SIZE,
  buildDashboardPagination,
} from '../../components/tables/tableDefaults.js'

function AssignmentNameCell({ row, renameMutation, t }) {
  const [name, setName] = useState(row.productName)
  const [editing, setEditing] = useState(false)
  const pending =
    renameMutation.isPending &&
    renameMutation.variables?.productId != null &&
    String(renameMutation.variables.productId) === String(row.productId)

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="truncate">{row.productName}</span>
        <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
          {t('shared.edit')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        disabled={pending}
        onChange={(e) => setName(e.target.value)}
        className="w-40"
      />
      <Button
        type="button"
        disabled={pending || !name.trim()}
        onClick={async () => {
          try {
            await renameMutation.mutateAsync({ productId: row.productId, name: name.trim() })
            message.success(t('malls.products.nameUpdated'))
            setEditing(false)
          } catch (e) {
            message.error(e?.message ?? t('malls.products.updateErr'))
          }
        }}
      >
        {t('shared.save')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          setName(row.productName)
          setEditing(false)
        }}
      >
        {t('shared.cancel')}
      </Button>
    </div>
  )
}

function AssignmentPriceCell({ row, updateMutation, t }) {
  // `row.price` is the EFFECTIVE price, so on a discounted product it is the
  // sale figure rather than the one this box sets. Editing from it would
  // write the sale price back as the real price and ratchet the product down
  // on every save; `comparePrice` is the original in that case.
  const basePrice = row.isOffer && row.comparePrice != null ? row.comparePrice : row.price
  const [price, setPrice] = useState(basePrice)
  const [editing, setEditing] = useState(false)
  const pending =
    updateMutation.isPending &&
    updateMutation.variables?.productId != null &&
    String(updateMutation.variables.productId) === String(row.productId)

  return (
    <div className="flex items-center gap-2">
      <InputNumber
        min={0.01}
        step={1}
        value={price}
        disabled={!editing || pending}
        onChange={(v) => setPrice(v ?? 0)}
        className="w-28"
      />
      {editing ? (
        <Button
          type="button"
          disabled={pending}
          onClick={async () => {
            try {
              await updateMutation.mutateAsync({
                productId: row.productId,
                payload: { price: Number(price) },
              })
              message.success(t('malls.products.priceUpdated'))
              setEditing(false)
            } catch (e) {
              message.error(e?.message ?? t('malls.products.updateErr'))
            }
          }}
        >
          {t('shared.save')}
        </Button>
      ) : (
        <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
          {t('shared.edit')}
        </Button>
      )}
      {row.isOffer && row.comparePrice != null ? (
        // The box holds the original; this is what the customer actually
        // pays. Without it a discounted product looked identical to an
        // undiscounted one at the same listed price.
        <span className="whitespace-nowrap text-xs text-emerald-600 dark:text-emerald-400">
          {t('malls.products.offerPrice', { price: row.price })}
        </span>
      ) : null}
    </div>
  )
}

function AssignmentAvailableSwitch({ row, updateMutation, t }) {
  const [checked, setChecked] = useState(row.isAvailable)
  const pending =
    updateMutation.isPending &&
    updateMutation.variables?.productId != null &&
    String(updateMutation.variables.productId) === String(row.productId)

  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await updateMutation.mutateAsync({
            productId: row.productId,
            payload: { is_available: next },
          })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('malls.products.updateErr'))
        }
      }}
    />
  )
}

/**
 * @param {{ mallId: string }} props
 */
export function MallProductsSection({ mallId }) {
  const { t } = useTranslation('pages')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Debounce so every keystroke doesn't fire a new request.
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(search.trim()), 300)
    return () => clearTimeout(id)
  }, [search])

  // A new search term (or mall) always restarts from page 1 — otherwise a filtered result set
  // smaller than the current page would render empty even though matches exist.
  useEffect(() => {
    setPage(1)
  }, [searchQuery, mallId])

  const {
    assignments,
    total,
    loading,
    error,
    refetch,
    createMutation,
    updateMutation,
    removeMutation,
    renameMutation,
  } = useMallProductsViewModel(mallId, { page, pageSize, search: searchQuery })

  const [modalOpen, setModalOpen] = useState(false)
  const [createForm] = Form.useForm()

  // Only fetched while the create dialog can be opened; the tree is shared
  // with the mall-categories screen, so React Query serves it from cache.
  const { categories, subcategories, loading: categoriesLoading } =
    useMallCategoriesViewModel()
  const categoryOptions = useMemo(() => {
    const rows = [...(categories ?? []), ...(subcategories ?? [])]
    return rows
      .filter((c) => c?.isActive !== false)
      .map((c) => ({ value: Number(c.id), label: c.name }))
  }, [categories, subcategories])
  const [removingId, setRemovingId] = useState(/** @type {string | null} */ (null))
  // A mall authors its own products now, so there is no catalogue to pick
  // from and no "already assigned" list to filter it against.
  async function handleCreate() {
    let values
    try {
      values = await createForm.validateFields()
    } catch {
      return // antd has already marked the offending fields
    }
    try {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        price: Number(values.price),
        description: values.description?.trim() || '',
        category_id: values.categoryId ?? null,
        stock_quantity: Number(values.stockQuantity) || 0,
        track_stock: Boolean(values.trackStock),
      })
      message.success(t('malls.products.created'))
      setModalOpen(false)
      createForm.resetFields()
    } catch (e) {
      message.error(e?.message ?? t('malls.products.createErr'))
    }
  }

  const columns = [
    {
      // The model has mapped `productImageUrl` since the catalogue was
      // retired and nothing read it, so a mall's products listed here as
      // rows of text while the merchant app showed their photos.
      title: '',
      key: 'image',
      width: 56,
      render: (_, row) =>
        row.productImageUrl ? (
          <img
            src={row.productImageUrl}
            alt=""
            loading="lazy"
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800" />
        ),
    },
    {
      title: t('malls.products.colName'),
      key: 'name',
      ellipsis: true,
      render: (_, row) => (
        <AssignmentNameCell row={row} renameMutation={renameMutation} t={t} />
      ),
    },
    { title: t('malls.products.colCategory'), dataIndex: 'productCategory', width: 140 },
    {
      title: t('malls.products.colPrice'),
      key: 'price',
      width: 200,
      render: (_, row) => (
        <AssignmentPriceCell row={row} updateMutation={updateMutation} t={t} />
      ),
    },
    {
      title: t('malls.products.colAvailable'),
      key: 'available',
      width: 100,
      render: (_, row) => (
        <AssignmentAvailableSwitch row={row} updateMutation={updateMutation} t={t} />
      ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 100,
      render: (_, row) => (
        <Button
          type="button"
          variant="ghost"
          disabled={removingId === row.productId}
          onClick={async () => {
            setRemovingId(row.productId)
            try {
              await removeMutation.mutateAsync(row.productId)
              message.success(t('malls.products.removed'))
            } catch (e) {
              message.error(e?.message ?? t('malls.products.removeErr'))
            } finally {
              setRemovingId(null)
            }
          }}
        >
          {t('shared.delete')}
        </Button>
      ),
    },
  ]

  return (
    <Card
      title={t('malls.products.title')}
      actions={
        <>
          <PriceSheetActions
            exportPrices={() => mallService.exportMallPrices(mallId)}
            importPrices={(file) => mallService.importMallPrices(mallId, file)}
            fallbackFilename={`mall-${mallId}-prices.xlsx`}
            onImported={refetch}
          />
          <Button type="button" onClick={() => setModalOpen(true)}>
            {t('malls.products.add')}
          </Button>
        </>
      }
    >
      <p className="text-xs text-slate-500 mb-1">{t('malls.products.nameEditNote')}</p>
      <p className="text-xs text-slate-500 mb-3">{t('malls.products.importPricesHint')}</p>
      <Input.Search
        allowClear
        placeholder={t('malls.products.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          className="mb-4"
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}
      <Spin spinning={loading}>
        <Table
          {...DASHBOARD_TABLE_PROPS}
          rowKey="id"
          dataSource={assignments}
          columns={columns}
          pagination={buildDashboardPagination({
            page,
            pageSize,
            total,
            showTotal: (count) => t('malls.products.totalCount', { count }),
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          })}
          locale={{ emptyText: t('malls.products.empty') }}
        />
      </Spin>

      <Modal
        title={t('malls.products.createModalTitle')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.isPending}
        okText={t('malls.products.createSubmit')}
        destroyOnHidden
      >
        {/* The mall authors the product here. Pictures are NOT set from this
            dashboard: an upload needs a product id, and the merchant adds them
            from the seller app, which owns that flow. The column on the left
            shows what they uploaded. (`uploadMallProductImages` and its two
            siblings exist in the service and the view model if this screen
            ever needs to manage them too.) */}
        <Form form={createForm} layout="vertical" className="py-2">
          <Form.Item
            name="name"
            label={t('malls.products.colName')}
            rules={[{ required: true, whitespace: true, message: t('malls.products.nameRequired') }]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item
            name="price"
            label={t('malls.products.price')}
            rules={[{ required: true, message: t('malls.products.priceRequired') }]}
          >
            <InputNumber min={0.01} className="w-full" />
          </Form.Item>
          <Form.Item name="categoryId" label={t('malls.products.category')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('malls.products.selectCategory')}
              options={categoryOptions}
              loading={categoriesLoading}
            />
          </Form.Item>
          <Form.Item name="stockQuantity" label={t('malls.products.stock')} initialValue={0}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item
            name="trackStock"
            label={t('malls.products.trackStock')}
            valuePropName="checked"
            initialValue={false}
            tooltip={t('malls.products.trackStockHint')}
          >
            <Switch />
          </Form.Item>
          <Form.Item name="description" label={t('malls.products.description')}>
            <Input.TextArea rows={3} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
