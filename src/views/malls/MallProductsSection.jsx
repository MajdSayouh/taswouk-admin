// Mall edit: assign catalog products with price / availability.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Input, InputNumber, Modal, Select, Spin, Switch, Table, message } from 'antd'
import { useQuery } from '@tanstack/react-query'
import * as mallCatalogService from '../../services/mallCatalogService.js'
import { mapMallCatalogProductFromApi } from '../../models/MallCatalogProduct.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useMallProductsViewModel } from '../../viewmodels/useMallProductsViewModel.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'

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
  const {
    assignments,
    loading,
    error,
    refetch,
    assignMutation,
    updateMutation,
    removeMutation,
    renameMutation,
  } = useMallProductsViewModel(mallId)

  const catalogQuery = useQuery({
    queryKey: queryKeys.mallCatalog.all(),
    queryFn: async () => {
      const { products } = await mallCatalogService.listMallCatalogProducts()
      return (Array.isArray(products) ? products : []).map(mapMallCatalogProductFromApi)
    },
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(/** @type {string | null} */ (null))
  const [assignPrice, setAssignPrice] = useState(/** @type {number | null} */ (null))
  const [removingId, setRemovingId] = useState(/** @type {string | null} */ (null))

  const assignedIds = useMemo(
    () => new Set(assignments.map((a) => String(a.productId))),
    [assignments],
  )

  const catalogOptions = useMemo(() => {
    const list = catalogQuery.data ?? []
    return list
      .filter((p) => p.isActive && !assignedIds.has(String(p.id)))
      .map((p) => ({ value: p.id, label: `${p.name} (${p.categoryName || '—'})` }))
  }, [catalogQuery.data, assignedIds])

  async function handleAssign() {
    if (!selectedProductId || assignPrice == null || assignPrice <= 0) {
      message.warning(t('malls.products.assignValidation'))
      return
    }
    try {
      await assignMutation.mutateAsync({
        product_id: Number(selectedProductId),
        price: Number(assignPrice),
      })
      message.success(t('malls.products.assigned'))
      setModalOpen(false)
      setSelectedProductId(null)
      setAssignPrice(null)
    } catch (e) {
      message.error(e?.message ?? t('malls.products.assignErr'))
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
        <Button type="button" onClick={() => setModalOpen(true)}>
          {t('malls.products.add')}
        </Button>
      }
    >
      <p className="text-xs text-slate-500 mb-3">{t('malls.products.nameEditNote')}</p>
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
          pagination={false}
          locale={{ emptyText: t('malls.products.empty') }}
        />
      </Spin>

      <Modal
        title={t('malls.products.assignModalTitle')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAssign}
        confirmLoading={assignMutation.isPending}
        okText={t('malls.products.assignSubmit')}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('malls.products.catalogProduct')}
            </label>
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder={t('malls.products.selectProduct')}
              options={catalogOptions}
              value={selectedProductId}
              onChange={setSelectedProductId}
              loading={catalogQuery.isFetching}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('malls.products.price')}
            </label>
            <InputNumber
              min={0.01}
              className="w-full"
              value={assignPrice}
              onChange={setAssignPrice}
            />
          </div>
        </div>
      </Modal>
    </Card>
  )
}
