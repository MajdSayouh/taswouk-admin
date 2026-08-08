// Mall categories + subcategories — admin CRUD aligned with Mall Categories API.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Form, Input, Modal, Select, Spin, Switch, Table, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { DashboardTableToolbar } from '../../components/tables/DashboardTableToolbar.jsx'
import { ColumnTextFilterDropdown } from '../../components/tables/ColumnTextFilterDropdown.jsx'
import { TriStateYesNoColumnFilter } from '../../components/tables/TriStateYesNoColumnFilter.jsx'
import { TableRowActions } from '../../components/tables/TableRowActions.jsx'
import { DashboardAddTriggerButton } from '../../components/tables/DashboardAddButton.jsx'
import { TruncatedTextCell } from '../../components/tables/TruncatedTextCell.jsx'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS, DEFAULT_PAGE_SIZE } from '../../components/tables/tableDefaults.js'
import { useMallCategoriesViewModel } from '../../viewmodels/useMallCategoriesViewModel.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { CategoryLogoField } from '../../components/categories/CategoryLogoField.jsx'

function MallCategoryActiveSwitch({ row, mutation, t }) {
  const [checked, setChecked] = useState(row.isActive)
  useEffect(() => {
    setChecked(row.isActive)
  }, [row.id, row.isActive])
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables) === String(row.id)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        const prev = checked
        setChecked(next)
        try {
          await mutation.mutateAsync(row.id)
        } catch (e) {
          setChecked(prev)
          message.error(e?.message ?? t('mallCategories.activeUpdateErr'))
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

export function MallCategoriesListPage() {
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
    moveCategory,
    toggleActiveMutation,
  } = useMallCategoriesViewModel()

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

  const logoLabels = {
    title: t('mallCategories.logo'),
    hint: t('mallCategories.logoHint'),
    upload: t('mallCategories.logoUpload'),
    remove: t('mallCategories.logoRemove'),
  }

  const filteredCategories = useMemo(() => {
    const rows = [...categories].sort(byName)
    return rows.filter((r) => {
      if (!rowMatchesSearch(categorySearch, r.name, r.id, r.description)) return false
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
        !rowMatchesSearch(subSearch, r.name, r.id, parentName, String(r.categoryId ?? ''), r.description)
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
    categoryForm.setFieldsValue({
      name: '',
      description: '',
      subcategory_name: '',
      is_active: true,
    })
    setCategoryModalOpen(true)
  }

  function openEditCategory(row) {
    setEditingCategory(row)
    setCategoryLogoFile(null)
    categoryForm.setFieldsValue({
      name: row.name,
      description: row.description ?? '',
      subcategory_name: '',
      is_active: row.isActive,
    })
    setCategoryModalOpen(true)
  }

  async function submitCategory() {
    const values = await categoryForm.validateFields()
    const payload = {
      name: String(values.name).trim(),
      description: String(values.description ?? '').trim() || null,
      is_active: Boolean(values.is_active),
    }
    if (editingCategory) {
      await updateCategory(editingCategory.id, payload)
      if (categoryLogoFile) await uploadCategoryLogo(editingCategory.id, categoryLogoFile)
      message.success(t('mallCategories.categoryUpdated'))
    } else {
      const created = await createCategory(payload)
      const parentId =
        created?.id ??
        created?.category_id ??
        created?.categoryId ??
        created?.data?.id ??
        created?.data?.category_id ??
        null
      if (categoryLogoFile && parentId != null) {
        await uploadCategoryLogo(parentId, categoryLogoFile)
      }
      const subcategoryName = String(values.subcategory_name ?? '').trim()
      if (subcategoryName) {
        if (parentId == null) {
          message.warning(t('mallCategories.subcategoryCreateNeedsParent'))
        } else {
          await createSubcategory({
            name: subcategoryName,
            category_id: Number(parentId),
            is_active: Boolean(values.is_active),
          })
          message.success(t('mallCategories.categoryWithSubCreated'))
        }
      } else {
        message.success(t('mallCategories.categoryCreated'))
      }
    }
    setCategoryModalOpen(false)
    setCategoryLogoFile(null)
  }

  function openCreateSubcategory() {
    setEditingSub(null)
    setSubLogoFile(null)
    subForm.setFieldsValue({ name: '', description: '', category_id: undefined, is_active: true })
    setSubModalOpen(true)
  }

  function openEditSubcategory(row) {
    setEditingSub(row)
    setSubLogoFile(null)
    subForm.setFieldsValue({
      name: row.name,
      description: row.description ?? '',
      category_id: row.categoryId ? Number(row.categoryId) : undefined,
      is_active: row.isActive,
    })
    setSubModalOpen(true)
  }

  async function submitSubcategory() {
    const values = await subForm.validateFields()
    const payload = {
      name: String(values.name).trim(),
      description: String(values.description ?? '').trim() || null,
      category_id: Number(values.category_id),
      is_active: Boolean(values.is_active),
    }
    if (editingSub) {
      // Parent changes use the dedicated move endpoint so cycle/name-collision errors remain clear.
      await updateSubcategory(editingSub.id, {
        name: payload.name,
        description: payload.description,
        is_active: payload.is_active,
      })
      if (String(editingSub.categoryId) !== String(values.category_id)) {
        await moveCategory(editingSub.id, Number(values.category_id))
      }
      if (subLogoFile) await uploadCategoryLogo(editingSub.id, subLogoFile)
      message.success(t('mallCategories.subUpdated'))
    } else {
      const created = await createSubcategory(payload)
      const subcategoryId =
        created?.id ?? created?.category_id ?? created?.categoryId ?? created?.data?.id ?? null
      if (subLogoFile && subcategoryId != null) {
        await uploadCategoryLogo(subcategoryId, subLogoFile)
      }
      message.success(t('mallCategories.subCreated'))
    }
    setSubModalOpen(false)
    setSubLogoFile(null)
  }

  async function confirmDeleteCategory(id) {
    setDeletingCatId(id)
    try {
      await deleteCategory(id)
      message.success(t('mallCategories.categoryDeleted'))
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
      message.success(t('mallCategories.subDeleted'))
    } catch (err) {
      message.error(err?.message ?? t('shared.deleteFailed'))
    } finally {
      setDeletingSubId(null)
    }
  }

  const categoryColumns = [
    {
      title: t('mallCategories.colCategory'),
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      filteredValue: colCatName ? [colCatName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('mallCategories.filterCategoryName')}
          value={colCatName}
          onApply={setColCatName}
          onReset={() => setColCatName('')}
          confirm={confirm}
        />
      ),
      render: (name, row) => (
        <div className="flex items-center gap-3">
          {row.logoUrl ? (
            <img
              src={resolvePublicMediaUrl(row.logoUrl)}
              alt=""
              className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-cover"
            />
          ) : null}
          <div>
            <p className="font-medium text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{t('mallCategories.idLine', { id: row.id })}</p>
          </div>
        </div>
      ),
    },
    {
      title: t('mallCategories.colDescription'),
      dataIndex: 'description',
      key: 'description',
      align: 'left',
      render: (value) => <TruncatedTextCell value={value} />,
    },
    {
      title: t('mallCategories.colSubcategories'),
      key: 'subCount',
      width: 160,
      align: 'left',
      filteredValue: colSubCount ? [colSubCount] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('mallCategories.filterSubCount')}
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
        <MallCategoryActiveSwitch row={row} mutation={toggleActiveMutation} t={t} />
      ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 168,
      align: 'left',
      fixed: 'right',
      render: (_, row) => (
        <TableRowActions
          onEdit={() => openEditCategory(row)}
          onDelete={() => confirmDeleteCategory(row.id)}
          deleteTitle={t('mallCategories.deleteCategoryTitle')}
          deleteDescription={t('mallCategories.deleteCategoryDesc')}
          deleteLoading={deletingCatId === row.id}
        />
      ),
    },
  ]

  const subcategoryColumns = [
    {
      title: t('mallCategories.colSubcategory'),
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      filteredValue: colSubName ? [colSubName] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('mallCategories.filterSubName')}
          value={colSubName}
          onApply={setColSubName}
          onReset={() => setColSubName('')}
          confirm={confirm}
        />
      ),
      render: (name, row) => (
        <div className="flex items-center gap-3">
          {row.logoUrl ? (
            <img
              src={resolvePublicMediaUrl(row.logoUrl)}
              alt=""
              className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-cover"
            />
          ) : null}
          <div>
            <p className="font-medium text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{t('mallCategories.idLine', { id: row.id })}</p>
          </div>
        </div>
      ),
    },
    {
      title: t('mallCategories.colParent'),
      key: 'parent',
      align: 'left',
      filteredValue: colParent ? [colParent] : null,
      filterDropdown: ({ confirm }) => (
        <ColumnTextFilterDropdown
          placeholder={t('mallCategories.filterParent')}
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
        <MallCategoryActiveSwitch row={row} mutation={toggleActiveMutation} t={t} />
      ),
    },
    {
      title: t('shared.actions'),
      key: 'actions',
      width: 168,
      align: 'left',
      fixed: 'right',
      render: (_, row) => (
        <TableRowActions
          onEdit={() => openEditSubcategory(row)}
          onDelete={() => confirmDeleteSub(row.id)}
          deleteTitle={t('mallCategories.deleteSubTitle')}
          deleteLoading={deletingSubId === row.id}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert type="error" showIcon title={t('mallCategories.errorTitle')} description={error} />
      ) : null}

      <Card
        title={t('mallCategories.listTitle', { suffix: catTitleSuffix })}
        actions={
          <DashboardAddTriggerButton onClick={openCreateCategory}>
            {t('mallCategories.addCategory')}
          </DashboardAddTriggerButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('mallCategories.searchCategories')}
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
              showTotal: (total) => t('mallCategories.paginationCategory', { count: total }),
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
        title={t('mallCategories.subListTitle', { suffix: subTitleSuffix })}
        actions={
          <DashboardAddTriggerButton onClick={openCreateSubcategory} disabled={categories.length === 0}>
            {t('mallCategories.addSubcategory')}
          </DashboardAddTriggerButton>
        }
      >
        <Spin spinning={loading}>
          <DashboardTableToolbar
            searchPlaceholder={t('mallCategories.searchSubcategories')}
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
              showTotal: (total) => t('mallCategories.paginationSub', { count: total }),
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
        title={
          editingCategory ? t('mallCategories.modalEditCategory') : t('mallCategories.modalCreateCategory')
        }
        open={categoryModalOpen}
        onCancel={() => {
          setCategoryModalOpen(false)
          setCategoryLogoFile(null)
        }}
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
                      setEditingCategory((prev) => (prev ? { ...prev, logoUrl: null } : prev))
                      message.success(t('mallCategories.logoRemoved'))
                    } catch (err) {
                      message.error(err?.message ?? t('shared.deleteFailed'))
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
            label={t('mallCategories.formName')}
            name="name"
            rules={[{ required: true, message: t('mallCategories.ruleCategoryName') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label={t('mallCategories.formDescription')} name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          {!editingCategory ? (
            <Form.Item label={t('mallCategories.formSubcategoryOptional')} name="subcategory_name">
              <Input placeholder={t('mallCategories.formSubcategoryOptionalPh')} />
            </Form.Item>
          ) : null}
          <Form.Item label={t('mallCategories.formActive')} name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSub ? t('mallCategories.modalEditSub') : t('mallCategories.modalCreateSub')}
        open={subModalOpen}
        onCancel={() => {
          setSubModalOpen(false)
          setSubLogoFile(null)
        }}
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
                      setEditingSub((prev) => (prev ? { ...prev, logoUrl: null } : prev))
                      message.success(t('mallCategories.logoRemoved'))
                    } catch (err) {
                      message.error(err?.message ?? t('shared.deleteFailed'))
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
            label={t('mallCategories.formName')}
            name="name"
            rules={[{ required: true, message: t('mallCategories.ruleSubName') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label={t('mallCategories.formDescription')} name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            label={t('mallCategories.formParent')}
            name="category_id"
            rules={[{ required: true, message: t('mallCategories.ruleParent') }]}
          >
            <Select
              placeholder={t('mallCategories.formParentPh')}
              options={categories.map((c) => ({ value: Number(c.id), label: c.name }))}
              className="w-full"
            />
          </Form.Item>
          <Form.Item label={t('mallCategories.formActive')} name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
