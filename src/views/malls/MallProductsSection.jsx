// Mall edit: the mall's own products — create, price, stock, availability.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Form, Input, InputNumber, Modal, Select, Spin, Switch, Table, message } from 'antd'
import * as mallService from '../../services/mallService.js'
import { useMallProductsViewModel } from '../../viewmodels/useMallProductsViewModel.js'
import { useMallCategoriesViewModel } from '../../viewmodels/useMallCategoriesViewModel.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
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
  const [price, setPrice] = useState(row.price)
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
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  async function handleExportPrices() {
    setExporting(true)
    try {
      const { blob, filename } = await mallService.exportMallPrices(mallId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `mall-${mallId}-prices.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      message.error(e?.message ?? t('malls.products.exportErr'))
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFileChosen(e) {
    const file = e.target.files?.[0] ?? null
    e.target.value = '' // allow re-selecting the same file name next time
    if (!file) return
    setImporting(true)
    try {
      await mallService.importMallPrices(mallId, file)
      message.success(t('malls.products.importSuccess'))
      refetch()
    } catch (err) {
      message.error(err?.message ?? t('malls.products.importErr'))
    } finally {
      setImporting(false)
    }
  }

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
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleImportFileChosen}
          />
          <Button
            type="button"
            variant="secondary"
            loading={exporting}
            onClick={handleExportPrices}
          >
            {t('malls.products.exportPrices')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={importing}
            onClick={() => importInputRef.current?.click()}
          >
            {t('malls.products.importPrices')}
          </Button>
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
        {/* The mall authors the product here. Pictures are added from the row's
            own actions once it exists, since an upload needs a product id. */}
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
