import { useMemo, useState } from 'react'
import { Alert, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useCategoriesViewModel } from '../../viewmodels/useCategoriesViewModel.js'

function byName(a, b) {
  return String(a?.name ?? '').localeCompare(String(b?.name ?? ''))
}

export function CategoriesListPage() {
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
  } = useCategoriesViewModel()

  const [categorySearch, setCategorySearch] = useState('')
  const [subSearch, setSubSearch] = useState('')

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm] = Form.useForm()

  const [subModalOpen, setSubModalOpen] = useState(false)
  const [editingSub, setEditingSub] = useState(null)
  const [subForm] = Form.useForm()

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    const rows = [...categories].sort(byName)
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.id.includes(q))
  }, [categories, categorySearch])

  const filteredSubcategories = useMemo(() => {
    const q = subSearch.trim().toLowerCase()
    const rows = [...subcategories].sort(byName)
    if (!q) return rows
    return rows.filter((r) => {
      const parentName = categories.find((c) => c.id === r.categoryId)?.name || r.categoryName || ''
      return (
        r.name.toLowerCase().includes(q) ||
        r.id.includes(q) ||
        String(parentName).toLowerCase().includes(q) ||
        String(r.categoryId).toLowerCase().includes(q)
      )
    })
  }, [subcategories, categories, subSearch])

  function openCreateCategory() {
    setEditingCategory(null)
    categoryForm.setFieldsValue({ name: '', is_active: true })
    setCategoryModalOpen(true)
  }

  function openEditCategory(row) {
    setEditingCategory(row)
    categoryForm.setFieldsValue({ name: row.name, is_active: row.isActive })
    setCategoryModalOpen(true)
  }

  async function submitCategory() {
    const values = await categoryForm.validateFields()
    const payload = {
      name: String(values.name).trim(),
      is_active: Boolean(values.is_active),
    }
    if (editingCategory) {
      await updateCategory(editingCategory.id, payload)
      message.success('Category updated')
    } else {
      await createCategory(payload)
      message.success('Category created')
    }
    setCategoryModalOpen(false)
  }

  function openCreateSubcategory() {
    setEditingSub(null)
    subForm.setFieldsValue({ name: '', category_id: undefined, is_active: true })
    setSubModalOpen(true)
  }

  function openEditSubcategory(row) {
    setEditingSub(row)
    subForm.setFieldsValue({
      name: row.name,
      category_id: row.categoryId || undefined,
      is_active: row.isActive,
    })
    setSubModalOpen(true)
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
      message.success('Subcategory updated')
    } else {
      await createSubcategory(payload)
      message.success('Subcategory created')
    }
    setSubModalOpen(false)
  }

  const categoryColumns = [
    {
      title: 'Category',
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">ID: {row.id}</p>
        </div>
      ),
    },
    {
      title: 'Subcategories',
      key: 'subCount',
      width: 160,
      render: (_, row) => {
        const count = (subcategoriesByCategory.get(String(row.id)) || []).length
        return <span className="tabular-nums">{count}</span>
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, row) =>
        row.isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="default">Inactive</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space>
          <Button type="button" variant="ghost" onClick={() => openEditCategory(row)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete category?"
            description="This may fail if subcategories still exist."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              try {
                await deleteCategory(row.id)
                message.success('Category deleted')
              } catch (err) {
                message.error(err?.message ?? 'Delete failed')
              }
            }}
          >
            <Button type="button" variant="ghost" className="!text-red-600">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const subcategoryColumns = [
    {
      title: 'Subcategory',
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">ID: {row.id}</p>
        </div>
      ),
    },
    {
      title: 'Parent category',
      key: 'parent',
      render: (_, row) => {
        const c = categories.find((x) => x.id === row.categoryId)
        const label = c?.name || row.categoryName || (row.categoryId ? `#${row.categoryId}` : '—')
        return <span>{label}</span>
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, row) =>
        row.isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="default">Inactive</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space>
          <Button type="button" variant="ghost" onClick={() => openEditSubcategory(row)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete subcategory?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              try {
                await deleteSubcategory(row.id)
                message.success('Subcategory deleted')
              } catch (err) {
                message.error(err?.message ?? 'Delete failed')
              }
            }}
          >
            <Button type="button" variant="ghost" className="!text-red-600">
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          showIcon
          title="Categories request failed"
          description={error}
        />
      ) : null}

      <Card
        title={`Categories (${filteredCategories.length})`}
        actions={
          <Button type="button" onClick={openCreateCategory}>
            + Add Category
          </Button>
        }
      >
        <div className="mb-3">
          <Input
            placeholder="Search categories by name or id…"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
          />
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={categoryColumns}
          dataSource={filteredCategories}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Card
        title={`Subcategories (${filteredSubcategories.length})`}
        actions={
          <Button type="button" onClick={openCreateSubcategory} disabled={categories.length === 0}>
            + Add Subcategory
          </Button>
        }
      >
        <div className="mb-3">
          <Input
            placeholder="Search subcategories by name, parent, or id…"
            value={subSearch}
            onChange={(e) => setSubSearch(e.target.value)}
          />
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={subcategoryColumns}
          dataSource={filteredSubcategories}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingCategory ? 'Edit category' : 'Create category'}
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={submitCategory}
        okText={editingCategory ? 'Save' : 'Create'}
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Category name is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Active" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSub ? 'Edit subcategory' : 'Create subcategory'}
        open={subModalOpen}
        onCancel={() => setSubModalOpen(false)}
        onOk={submitSubcategory}
        okText={editingSub ? 'Save' : 'Create'}
      >
        <Form form={subForm} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Subcategory name is required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Parent category"
            name="category_id"
            rules={[{ required: true, message: 'Parent category is required' }]}
          >
            <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 w-full">
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Form.Item>
          <Form.Item label="Active" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
