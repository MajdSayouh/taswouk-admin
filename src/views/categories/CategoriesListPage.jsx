// Categories + subcategories — same table UX as other dashboard lists (toolbar, column filters, row actions).
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button as AntButton,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { Card } from '../../components/ui/Card'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddTriggerButton } from '../../components/tables/DashboardAddButton.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS, DEFAULT_PAGE_SIZE } from '../../components/tables/tableDefaults.js'
import { useCategoriesViewModel } from '../../viewmodels/useCategoriesViewModel.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { CategoryLogoField } from '../../components/categories/CategoryLogoField.jsx'
import { ProductTableThumbnail } from '../../components/products/ProductTableThumbnail.jsx'
import { fetchProductsList } from '../../query/fetchers/productList.js'
import { queryKeys } from '../../query/queryKeys.js'

function CategoryActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.id) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync({ id: row.id, payload: { is_active: next } })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('categories.activeUpdateErr'))
        }
      }}
    />
  )
}

function SubcategoryActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.id) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync({ id: row.id, payload: { is_active: next } })
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('categories.activeUpdateErr'))
        }
      }}
    />
  )
}

function byName(a, b) {
  return String(a?.name ?? '').localeCompare(String(b?.name ?? ''))
}

function matchesTriYesNo(/** @type {string[] | null} */ col, /** @type {boolean} */ valueIsActive) {
  if (!col || !col.length) return true
  const y = col.includes('yes')
  const n = col.includes('no')
  if (y && !n) return valueIsActive === true
  if (n && !y) return valueIsActive === false
  return true
}

export function CategoriesListPage() {
  const { t } = useTranslation('pages')
  const {
    categories,
    subcategories,
    subcategoriesByCategory,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    uploadCategoryLogo,
    deleteCategoryLogo,
    updateCategoryMutation,
    updateSubcategoryMutation,
  } = useCategoriesViewModel()

  const [categorySearch, setCategorySearch] = useState('')
  const [subSearch, setSubSearch] = useState('')
  const [catPage, setCatPage] = useState(1)
  const [catPageSize, setCatPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [subPage, setSubPage] = useState(1)
  const [subPageSize, setSubPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [colCatName, setColCatName] = useState('')
  const [colSubCount, setColSubCount] = useState('')
  /** @type {string[] | null} */
  const [colCatActive, setColCatActive] = useState(null)

  const [colSubName, setColSubName] = useState('')
  const [colParent, setColParent] = useState('')
  /** @type {string[] | null} */
  const [colSubActive, setColSubActive] = useState(null)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm] = Form.useForm()

  const [subModalOpen, setSubModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState(null)
  const [subForm] = Form.useForm()

  const [deletingCatId, setDeletingCatId] = useState(null)
  const [deletingSubId, setDeletingSubId] = useState(null)
  const [categoryLogoFile, setCategoryLogoFile] = useState(/** @type {File | null} */ (null))
  const [subLogoFile, setSubLogoFile] = useState(/** @type {File | null} */ (null))
  const [logoRemoving, setLogoRemoving] = useState(false)
  const [productViewer, setProductViewer] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productPage, setProductPage] = useState(1)
  const [productPageSize, setProductPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setProductSearchQuery(productSearch.trim()), 300)
    return () => window.clearTimeout(timeoutId)
  }, [productSearch])

  const productViewerParams = useMemo(() => {
    if (!productViewer) return null
    return {
      page: productPage,
      page_size: productPageSize,
      ...(productSearchQuery ? { q: productSearchQuery } : {}),
      ...(productViewer.type === 'subcategory'
        ? { category_id: Number(productViewer.id) }
        : { category: productViewer.name }),
    }
  }, [productViewer, productPage, productPageSize, productSearchQuery])

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(productViewerParams ?? {}),
    queryFn: ({ signal }) => fetchProductsList({ signal, params: productViewerParams }),
    enabled: productViewerParams != null,
  })

  const viewerProducts = productsQuery.data?.rows ?? []
  const viewerProductTotal = productsQuery.data?.total ?? 0
  const viewerProductTotalIsExact = Boolean(productsQuery.data?.totalIsExact)

  function openProductViewer(row, type) {
    setProductViewer({ id: row.id, name: row.name, type })
    setProductSearch('')
    setProductSearchQuery('')
    setProductPage(1)
  }

  const productViewerColumns = [
    {
      title: t('products.list.colImage'),
      key: 'image',
      width: 72,
      align: 'center',
      render: (_, product) =>
        product.imageUrl ? (
          <ProductTableThumbnail
            storagePath={product.imageUrl}
            productId={product.id}
            size={40}
            className="object-cover"
          />
        ) : (
          <span className="text-slate-400">{t('shared.emDash')}</span>
        ),
    },
    {
      title: t('products.list.colName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('products.list.colStore'),
      dataIndex: 'storeId',
      key: 'storeId',
      width: 110,
      render: (value) => (value ? `#${value}` : t('shared.emDash')),
    },
    {
      title: t('products.list.colPrice'),
      dataIndex: 'price',
      key: 'price',
      width: 130,
      render: (value) => <span className="tabular-nums">{Number(value ?? 0).toFixed(2)}</span>,
    },
    {
      title: t('products.list.colStatus'),
      dataIndex: 'isActive',
      key: 'status',
      width: 110,
      render: (active) =>
        active ? <Tag color="green">{t('shared.active')}</Tag> : <Tag>{t('shared.inactive')}</Tag>,
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 120,
      render: (_, product) => (
        <TableRowActions editTo={`/products/${product.id}/edit`} showDelete={false} />
      ),
    },
  ]

  const logoLabels = useMemo(
    () => ({
      title: t('categories.formLogo'),
      hint: t('categories.formLogoHint'),
      upload: t('categories.formLogoUpload'),
      remove: t('categories.formLogoRemove'),
    }),
    [t],
  )

  const renderLogoCell = (logoUrl) =>
    logoUrl ? (
      <img
        src={resolvePublicMediaUrl(logoUrl)}
        alt=""
        className="h-10 w-10 rounded-md border border-slate-200 object-cover"
      />
    ) : (
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
        —
      </span>
    )

  const filteredCategories = useMemo(() => {
    const rows = [...categories].sort(byName)
    return rows.filter((r) => {
      if (!rowMatchesSearch(categorySearch, r.name, r.id)) return false
      if (colCatName && !String(r.name ?? '').toLowerCase().includes(colCatName.toLowerCase())) return false
      const count = (subcategoriesByCategory.get(String(r.id)) || []).length
      if (colSubCount && !String(count).includes(colSubCount)) return false
      if (!matchesTriYesNo(colCatActive, r.isActive)) return false
      return true
    })
  }, [categories, categorySearch, colCatName, colSubCount, colCatActive, subcategoriesByCategory])

  const filteredSubcategories = useMemo(() => {
    const rows = [...subcategories].sort(byName)
    return rows.filter((r) => {
      const parentName =
        categories.find((c) => c.id === r.categoryId)?.name || r.categoryName || ''
      if (
        !rowMatchesSearch(subSearch, r.name, r.id, parentName, String(r.categoryId ?? ''))
      ) {
        return false
      }
      if (colSubName && !String(r.name ?? '').toLowerCase().includes(colSubName.toLowerCase())) return false
      if (
        colParent &&
        !String(parentName ?? '')
          .toLowerCase()
          .includes(colParent.toLowerCase()) &&
        !String(r.categoryId ?? '').includes(colParent)
      ) {
        return false
      }
      if (!matchesTriYesNo(colSubActive, r.isActive)) return false
      return true
    })
  }, [subcategories, categories, subSearch, colSubName, colParent, colSubActive])

  const catDisplayTotal = filteredCategories.length
  const subDisplayTotal = filteredSubcategories.length

  useEffect(() => {
    setCatPage(1)
  }, [categorySearch, colCatName, colSubCount, colCatActive])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(catDisplayTotal / catPageSize) || 1)
    if (catPage > maxPage) setCatPage(maxPage)
  }, [catDisplayTotal, catPageSize, catPage])

  useEffect(() => {
    setSubPage(1)
  }, [subSearch, colSubName, colParent, colSubActive])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(subDisplayTotal / subPageSize) || 1)
    if (subPage > maxPage) setSubPage(maxPage)
  }, [subDisplayTotal, subPageSize, subPage])

  const catTitleSuffix =
    catDisplayTotal !== categories.length
      ? t('shared.shownOfTotal', { shown: catDisplayTotal, total: categories.length })
      : t('shared.count', { count: catDisplayTotal })

  const subTitleSuffix =
    subDisplayTotal !== subcategories.length
      ? t('shared.shownOfTotal', { shown: subDisplayTotal, total: subcategories.length })
      : t('shared.count', { count: subDisplayTotal })

  function openCreateCategory() {
    setEditingCategory(null)
    setCategoryLogoFile(null)
    categoryForm.setFieldsValue({ name: '', subcategory_name: '', is_active: true })
    setCategoryModalOpen(true)
  }

  function openEditCategory(row) {
    setEditingCategory(row)
    setCategoryLogoFile(null)
    categoryForm.setFieldsValue({ name: row.name, subcategory_name: '', is_active: row.isActive })
    setCategoryModalOpen(true)
  }

  async function syncCategoryLogo(categoryId) {
    if (!categoryLogoFile || categoryId == null || categoryId === '') return
    try {
      await uploadCategoryLogo(categoryId, categoryLogoFile)
    } catch (uploadErr) {
      message.warning(uploadErr?.message ?? t('categories.logoUploadErr'))
    }
  }

  async function submitCategory() {
    const values = await categoryForm.validateFields()
    const payload = {
      name: String(values.name).trim(),
      is_active: Boolean(values.is_active),
    }
    if (editingCategory) {
      await updateCategory(editingCategory.id, payload)
      await syncCategoryLogo(editingCategory.id)
      message.success(t('categories.categoryUpdated'))
    } else {
      const created = await createCategory(payload)
      const parentId =
        created?.id ??
        created?.category_id ??
        created?.categoryId ??
        created?.data?.id ??
        created?.data?.category_id ??
        null
      await syncCategoryLogo(parentId)
      const subcategoryName = String(values.subcategory_name ?? '').trim()
      if (subcategoryName) {
        if (parentId == null) {
          message.warning(t('categories.subcategoryCreateNeedsParent'))
        } else {
          await createSubcategory({
            name: subcategoryName,
            category_id: Number(parentId),
            is_active: Boolean(values.is_active),
          })
          message.success(t('categories.categoryWithSubCreated'))
        }
      } else {
        message.success(t('categories.categoryCreated'))
      }
    }
    setCategoryModalOpen(false)
    setCategoryLogoFile(null)
  }

  function openCreateSubcategory() {
    setEditingSub(null)
    setSubLogoFile(null)
    subForm.setFieldsValue({ name: '', category_id: undefined, is_active: true })
    setSubModalOpen(true)
  }

  function openEditSubcategory(row) {
    setEditingSub(row)
    setSubLogoFile(null)
    subForm.setFieldsValue({
      name: row.name,
      category_id: row.categoryId || undefined,
      is_active: row.isActive,
    })
    setSubModalOpen(true)
  }

  async function syncSubcategoryLogo(subcategoryId) {
    if (!subLogoFile || subcategoryId == null || subcategoryId === '') return
    try {
      await uploadCategoryLogo(subcategoryId, subLogoFile)
    } catch (uploadErr) {
      message.warning(uploadErr?.message ?? t('categories.logoUploadErr'))
    }
  }

  async function submitSubcategory() {
    const values = await subForm.validateFields()
    const payload = {
      name: String(values.name).trim(),
      category_id: Number(values.category_id),
      is_active: Boolean(values.is_active),
    }
    if (editingSub) {
      await updateSubcategory(editingSub.id, payload)
      await syncSubcategoryLogo(editingSub.id)
      message.success(t('categories.subUpdated'))
    } else {
      const created = await createSubcategory(payload)
      const subId =
        created?.id ??
        created?.category_id ??
        created?.categoryId ??
        created?.data?.id ??
        null
      await syncSubcategoryLogo(subId)
      message.success(t('categories.subCreated'))
    }
    setSubModalOpen(false)
    setSubLogoFile(null)
  }

  async function confirmDeleteCategory(id) {
    setDeletingCatId(id)
    try {
      await deleteCategory(id)
      message.success(t('categories.categoryDeleted'))
    } catch (err) {
      message.error(err?.message ?? t('shared.deleteFailed'))
    } finally {
      setDeletingCatId(null)
    }
  }

  async function confirmDeleteSub(id) {
    setDeletingSubId(id)
    try {
      await deleteSubcategory(id)
      message.success(t('categories.subDeleted'))
    } catch (err) {
      message.error(err?.message ?? t('shared.deleteFailed'))
    } finally {
      setDeletingSubId(null)
    }
  }

  const categoryColumns = [
    {
      title: t('categories.colLogo'),
      key: 'logo',
      width: 72,
      align: 'center',
      render: (_, row) => renderLogoCell(row.logoUrl),
    },
    {
      title: t('categories.colCategory'),
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      filteredValue: colCatName ? [colCatName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('categories.filterCategoryName')}
          value={colCatName}
          onApply={setColCatName}
          onReset={() => setColCatName('')}
          confirm={confirm}
        />
      ),
      render: (name, row) => (
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{t('categories.idLine', { id: row.id })}</p>
        </div>
      ),
    },
    {
      title: t('categories.colSubcategories'),
      key: 'subCount',
      width: 160,
      align: 'left',
      filteredValue: colSubCount ? [colSubCount] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('categories.filterSubCount')}
          value={colSubCount}
          onApply={setColSubCount}
          onReset={() => setColSubCount('')}
          confirm={confirm}
        />
      ),
      render: (_, row) => {
        const count = (subcategoriesByCategory.get(String(row.id)) || []).length
        return <span className="tabular-nums">{count}</span>
      },
    },
    {
      title: t('shared.status'),
      key: 'status',
      width: 140,
      align: 'left',
      filteredValue: colCatActive && colCatActive.length ? colCatActive : null,
      filterDropdown: ({ confirm }) => (
        <TriStateYesNoColumnFilter
          value={colCatActive}
          onApply={setColCatActive}
          confirm={confirm}
          placeholder={t('shared.status')}
        />
      ),
      render: (_, row) => (
        <CategoryActiveSwitch row={row} mutation={updateCategoryMutation} t={t} />
      ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 330,
      align: 'left',
      fixed: 'right',
      render: (_, row) => (
        <Space size="small" wrap>
          <AntButton icon={<EyeOutlined />} onClick={() => openProductViewer(row, 'category')}>
            {t('categories.viewProducts')}
          </AntButton>
          <TableRowActions
            onEdit={() => openEditCategory(row)}
            onDelete={() => confirmDeleteCategory(row.id)}
            deleteTitle={t('categories.deleteCategoryTitle')}
            deleteDescription={t('categories.deleteCategoryDesc')}
            deleteLoading={deletingCatId === row.id}
          />
        </Space>
      ),
    },
  ]

  const subcategoryColumns = [
    {
      title: t('categories.colLogo'),
      key: 'logo',
      width: 72,
      align: 'center',
      render: (_, row) => renderLogoCell(row.logoUrl),
    },
    {
      title: t('categories.colSubcategory'),
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      filteredValue: colSubName ? [colSubName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('categories.filterSubName')}
          value={colSubName}
          onApply={setColSubName}
          onReset={() => setColSubName('')}
          confirm={confirm}
        />
      ),
      render: (name, row) => (
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{t('categories.idLine', { id: row.id })}</p>
        </div>
      ),
    },
    {
      title: t('categories.colParent'),
      key: 'parent',
      align: 'left',
      filteredValue: colParent ? [colParent] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('categories.filterParent')}
          value={colParent}
          onApply={setColParent}
          onReset={() => setColParent('')}
          confirm={confirm}
        />
      ),
      render: (_, row) => {
        const c = categories.find((x) => x.id === row.categoryId)
        const label =
          c?.name ||
          row.categoryName ||
          (row.categoryId ? `#${row.categoryId}` : t('shared.emDash'))
        return <span>{label}</span>
      },
    },
    {
      title: t('shared.status'),
      key: 'status',
      width: 140,
      align: 'left',
      filteredValue: colSubActive && colSubActive.length ? colSubActive : null,
      filterDropdown: ({ confirm }) => (
        <TriStateYesNoColumnFilter
          value={colSubActive}
          onApply={setColSubActive}
          confirm={confirm}
          placeholder={t('shared.status')}
        />
      ),
      render: (_, row) => (
        <SubcategoryActiveSwitch row={row} mutation={updateSubcategoryMutation} t={t} />
      ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 330,
      align: 'left',
      fixed: 'right',
      render: (_, row) => (
        <Space size="small" wrap>
          <AntButton icon={<EyeOutlined />} onClick={() => openProductViewer(row, 'subcategory')}>
            {t('categories.viewProducts')}
          </AntButton>
          <TableRowActions
            onEdit={() => openEditSubcategory(row)}
            onDelete={() => confirmDeleteSub(row.id)}
            deleteTitle={t('categories.deleteSubTitle')}
            deleteLoading={deletingSubId === row.id}
          />
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert type="error" showIcon title={t('categories.errorTitle')} description={error} />
      ) : null}

      <Card
        title={t('categories.listTitle', { suffix: catTitleSuffix })}
        actions={
          <DashboardAddTriggerButton onClick={openCreateCategory}>
            {t('categories.addCategory')}
          </DashboardAddTriggerButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('categories.searchCategories')}
            searchValue={categorySearch}
            onSearchChange={setCategorySearch}
          />
          <Table
            rowKey="id"
            columns={categoryColumns}
            dataSource={filteredCategories}
            pagination={buildDashboardPagination({
              page: catPage,
              pageSize: catPageSize,
              total: catDisplayTotal,
              showTotal: (total) => t('categories.paginationCategory', { count: total }),
              onChange: (p, ps) => {
                setCatPage(p)
                setCatPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>

      <Card
        title={t('categories.subListTitle', { suffix: subTitleSuffix })}
        actions={
          <DashboardAddTriggerButton onClick={openCreateSubcategory} disabled={categories.length === 0}>
            {t('categories.addSubcategory')}
          </DashboardAddTriggerButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('categories.searchSubcategories')}
            searchValue={subSearch}
            onSearchChange={setSubSearch}
          />
          <Table
            rowKey="id"
            columns={subcategoryColumns}
            dataSource={filteredSubcategories}
            pagination={buildDashboardPagination({
              page: subPage,
              pageSize: subPageSize,
              total: subDisplayTotal,
              showTotal: (total) => t('categories.paginationSub', { count: total }),
              onChange: (p, ps) => {
                setSubPage(p)
                setSubPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>

      <Modal
        title={editingCategory ? t('categories.modalEditCategory') : t('categories.modalCreateCategory')}
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={submitCategory}
        okText={editingCategory ? t('shared.save') : t('shared.create')}
      >
        <Form form={categoryForm} layout="vertical">
          <CategoryLogoField
            existingLogoUrl={editingCategory?.logoUrl}
            file={categoryLogoFile}
            onFileChange={setCategoryLogoFile}
            onRemoveExisting={
              editingCategory?.logoUrl
                ? async () => {
                    setLogoRemoving(true)
                    try {
                      await deleteCategoryLogo(editingCategory.id)
                      setCategoryLogoFile(null)
                      message.success(t('categories.logoRemoved'))
                    } catch (e) {
                      message.error(e?.message ?? t('shared.deleteFailed'))
                    } finally {
                      setLogoRemoving(false)
                    }
                  }
                : undefined
            }
            removing={logoRemoving}
            labels={logoLabels}
          />
          <Form.Item
            label={t('categories.formName')}
            name="name"
            rules={[{ required: true, message: t('categories.ruleCategoryName') }]}
          >
            <Input />
          </Form.Item>
          {!editingCategory ? (
            <Form.Item label={t('categories.formSubcategoryOptional')} name="subcategory_name">
              <Input placeholder={t('categories.formSubcategoryOptionalPh')} />
            </Form.Item>
          ) : null}
          <Form.Item label={t('categories.formActive')} name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={t('categories.productsDrawerTitle', { name: productViewer?.name ?? '' })}
        open={productViewer != null}
        onClose={() => setProductViewer(null)}
        width={920}
        destroyOnHidden
      >
        {productsQuery.error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title={t('categories.productsLoadError')}
            description={productsQuery.error.message}
          />
        ) : null}
        <Input.Search
          allowClear
          className="mb-4 max-w-md"
          placeholder={t('categories.searchProducts')}
          value={productSearch}
          onChange={(event) => {
            setProductSearch(event.target.value)
            setProductPage(1)
          }}
        />
        <Table
          rowKey="id"
          columns={productViewerColumns}
          dataSource={viewerProducts}
          loading={productsQuery.isFetching}
          locale={{ emptyText: t('categories.noProducts') }}
          pagination={buildDashboardPagination({
            page: productPage,
            pageSize: productPageSize,
            total: viewerProductTotal,
            showTotal: viewerProductTotalIsExact
              ? (total) => t('products.list.pagination', { count: total })
              : (_total, range) =>
                  t('products.list.paginationRange', { from: range[0], to: range[1] }),
            onChange: (nextPage, nextPageSize) => {
              setProductPage(nextPage)
              setProductPageSize(nextPageSize)
            },
          })}
          {...DASHBOARD_TABLE_PROPS}
        />
      </Drawer>

      <Modal
        title={editingSub ? t('categories.modalEditSub') : t('categories.modalCreateSub')}
        open={subModalOpen}
        onCancel={() => setSubModalOpen(false)}
        onOk={submitSubcategory}
        okText={editingSub ? t('shared.save') : t('shared.create')}
      >
        <Form form={subForm} layout="vertical">
          <CategoryLogoField
            existingLogoUrl={editingSub?.logoUrl}
            file={subLogoFile}
            onFileChange={setSubLogoFile}
            onRemoveExisting={
              editingSub?.logoUrl
                ? async () => {
                    setLogoRemoving(true)
                    try {
                      await deleteCategoryLogo(editingSub.id)
                      setSubLogoFile(null)
                      message.success(t('categories.logoRemoved'))
                    } catch (e) {
                      message.error(e?.message ?? t('shared.deleteFailed'))
                    } finally {
                      setLogoRemoving(false)
                    }
                  }
                : undefined
            }
            removing={logoRemoving}
            labels={logoLabels}
          />
          <Form.Item
            label={t('categories.formName')}
            name="name"
            rules={[{ required: true, message: t('categories.ruleSubName') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('categories.formParent')}
            name="category_id"
            rules={[{ required: true, message: t('categories.ruleParent') }]}
          >
            <Select
              placeholder={t('categories.formParentPh')}
              options={categories.map((c) => ({ value: Number(c.id), label: c.name }))}
              className="w-full"
            />
          </Form.Item>
          <Form.Item label={t('categories.formActive')} name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
