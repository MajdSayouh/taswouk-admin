// Dialogs for the categories page. Each one works inside a single section:
// the tree it is handed is that section's only, so a parent or a target from
// another section is never offered (and the backend refuses one anyway).
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  TreeSelect,
  message,
} from 'antd'
import { CategoryLogoField } from './CategoryLogoField.jsx'
import { CATEGORY_SCOPES } from '../../models/Category.js'
import { ROOT_PARENT_VALUE, findNode, placementOptions } from '../../models/CategoryTree.js'
import { listCategoryChangeLog } from '../../services/categoryService.js'
import { queryKeys } from '../../query/queryKeys.js'

function useLogoLabels(t) {
  return useMemo(
    () => ({
      title: t('categories.formLogo'),
      hint: t('categories.formLogoHint'),
      upload: t('categories.formLogoUpload'),
      remove: t('categories.formLogoRemove'),
    }),
    [t],
  )
}

/** The category's impact, fetched fresh each time a dialog opens on it. */
function useImpact(open, node, getImpact) {
  const query = useQuery({
    queryKey: [...queryKeys.categories.all(), 'impact', node?.id],
    queryFn: () => getImpact(node.id),
    enabled: open && node != null,
    staleTime: 0,
    gcTime: 0,
  })
  return { loading: query.isFetching, data: query.data ?? null, error: query.error?.message ?? null }
}

function ImpactSummary({ impact, t }) {
  if (!impact) return null
  return (
    <Descriptions size="small" column={1} bordered className="mb-4">
      <Descriptions.Item label={t('categories.tree.impactChildren')}>
        {impact.descendants_count}
      </Descriptions.Item>
      <Descriptions.Item label={t('categories.tree.impactDirect')}>
        {impact.direct_products + (impact.direct_mall_products ?? 0)}
      </Descriptions.Item>
      <Descriptions.Item label={t('categories.tree.impactSubtree')}>
        {impact.subtree_products + (impact.subtree_mall_products ?? 0)}
      </Descriptions.Item>
      <Descriptions.Item label={t('categories.tree.impactStores')}>{impact.subtree_stores}</Descriptions.Item>
    </Descriptions>
  )
}

// ── create / edit ───────────────────────────────────────────────────────────

/**
 * @param {{
 *   open: boolean
 *   node: import('../../models/CategoryTree.js').CategoryNode | null  // null = create
 *   defaultParentId?: string | null
 *   tree: import('../../models/CategoryTree.js').CategoryNode[]
 *   vm: ReturnType<typeof import('../../viewmodels/useCategoryTreeViewModel.js').useCategoryTreeViewModel>
 *   onClose: () => void
 * }} props
 */
export function CategoryFormModal({ open, node, defaultParentId, tree, vm, onClose }) {
  const { t } = useTranslation('pages')
  const [form] = Form.useForm()
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [removingLogo, setRemovingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const logoLabels = useLogoLabels(t)
  const editing = node != null

  useEffect(() => {
    if (!open) return
    setLogoFile(null)
    form.setFieldsValue({
      name: node?.name ?? '',
      is_active: node?.isActive ?? true,
      parent: editing
        ? (node.parentId ?? ROOT_PARENT_VALUE)
        : (defaultParentId ?? ROOT_PARENT_VALUE),
    })
  }, [open, node, editing, defaultParentId, form])

  const parentOptions = useMemo(
    () => placementOptions(tree, node, { rootLabel: t('categories.tree.rootOption') }),
    [tree, node, t],
  )

  async function submit() {
    const values = await form.validateFields()
    const parentId = values.parent === ROOT_PARENT_VALUE ? null : Number(values.parent)
    setSaving(true)
    try {
      let id = node?.id
      if (editing) {
        const payload = {}
        const name = String(values.name).trim()
        if (name !== node.name) payload.name = name
        if (Boolean(values.is_active) !== node.isActive) payload.is_active = Boolean(values.is_active)
        const currentParent = node.parentId == null ? null : Number(node.parentId)
        if (parentId !== currentParent) payload.parent_id = parentId
        if (Object.keys(payload).length) await vm.update.mutateAsync({ id: node.id, payload })
      } else {
        const created = await vm.create.mutateAsync({
          name: String(values.name).trim(),
          is_active: Boolean(values.is_active),
          parent_id: parentId,
        })
        id = created?.id
      }
      if (logoFile && id != null) {
        try {
          await vm.uploadLogo.mutateAsync({ id, file: logoFile })
        } catch (e) {
          message.warning(e?.message ?? t('categories.logoUploadErr'))
        }
      }
      message.success(editing ? t('categories.categoryUpdated') : t('categories.categoryCreated'))
      onClose()
    } catch (e) {
      message.error(e?.message ?? t('shared.saveFailed', { defaultValue: 'Save failed' }))
    } finally {
      setSaving(false)
    }
  }

  const parentPath = editing && node.parentId ? findNode(tree, node.parentId)?.path?.join(' › ') : null

  return (
    <Modal
      title={editing ? t('categories.modalEditCategory') : t('categories.modalCreateCategory')}
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText={editing ? t('shared.save') : t('shared.create')}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <CategoryLogoField
          existingLogoUrl={node?.logoUrl}
          file={logoFile}
          onFileChange={setLogoFile}
          onRemoveExisting={
            node?.logoUrl
              ? async () => {
                  setRemovingLogo(true)
                  try {
                    await vm.deleteLogo.mutateAsync(node.id)
                    message.success(t('categories.logoRemoved'))
                  } catch (e) {
                    message.error(e?.message ?? t('shared.deleteFailed'))
                  } finally {
                    setRemovingLogo(false)
                  }
                }
              : undefined
          }
          removing={removingLogo}
          labels={logoLabels}
        />
        <Form.Item
          label={t('categories.formName')}
          name="name"
          rules={[{ required: true, whitespace: true, message: t('categories.ruleCategoryName') }]}
        >
          <Input maxLength={150} />
        </Form.Item>
        <Form.Item
          label={t('categories.formParent')}
          name="parent"
          extra={
            editing
              ? t('categories.tree.parentHintEdit', { current: parentPath ?? t('categories.tree.rootOption') })
              : t('categories.tree.parentHint')
          }
        >
          <TreeSelect
            treeData={parentOptions}
            treeDefaultExpandAll
            showSearch
            treeNodeFilterProp="title"
            className="w-full"
          />
        </Form.Item>
        <Form.Item label={t('categories.formActive')} name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── delete (with reassignment) ──────────────────────────────────────────────

export function CategoryDeleteModal({ open, node, tree, vm, onClose }) {
  const { t } = useTranslation('pages')
  const { loading, data: impact, error } = useImpact(open, node, vm.getImpact)
  const [target, setTarget] = useState(/** @type {string | undefined} */ (undefined))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setTarget(undefined)
  }, [open, node])

  const hasChildren = (impact?.children_count ?? 0) > 0
  const productCount = (impact?.direct_products ?? 0) + (impact?.direct_mall_products ?? 0)
  const needsTarget = productCount > 0
  const targets = useMemo(
    () =>
      node
        ? placementOptions(tree, null, { asTargets: true, onlyActive: true, excludeIds: new Set([node.id]) })
        : [],
    [tree, node],
  )

  async function submit() {
    setSaving(true)
    try {
      await vm.remove.mutateAsync({ id: node.id, reassignTo: needsTarget ? target : null })
      message.success(
        needsTarget
          ? t('categories.tree.deletedWithMove', { count: productCount })
          : t('categories.categoryDeleted'),
      )
      onClose()
    } catch (e) {
      message.error(e?.message ?? t('shared.deleteFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('categories.tree.deleteTitle', { name: node?.name ?? '' })}
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText={t('categories.tree.deleteOk')}
      okButtonProps={{ danger: true, disabled: loading || !!error || hasChildren || (needsTarget && !target) }}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {error ? <Alert type="error" showIcon className="mb-4" title={error} /> : null}
        <ImpactSummary impact={impact} t={t} />
        {hasChildren ? (
          <Alert type="warning" showIcon title={t('categories.tree.deleteHasChildren')} />
        ) : needsTarget ? (
          <>
            <Alert
              type="info"
              showIcon
              className="mb-3"
              title={t('categories.tree.deleteNeedsTarget', { count: productCount })}
            />
            <TreeSelect
              value={target}
              onChange={setTarget}
              treeData={targets}
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              placeholder={t('categories.tree.targetPh')}
              className="w-full"
            />
          </>
        ) : impact ? (
          <p className="text-sm text-slate-600">{t('categories.tree.deleteEmpty')}</p>
        ) : null}
      </Spin>
    </Modal>
  )
}

// ── move products ───────────────────────────────────────────────────────────

export function CategoryMoveProductsModal({ open, node, tree, vm, onClose }) {
  const { t } = useTranslation('pages')
  const { loading, data: impact, error } = useImpact(open, node, vm.getImpact)
  const [target, setTarget] = useState(/** @type {string | undefined} */ (undefined))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setTarget(undefined)
  }, [open, node])

  const targets = useMemo(
    () =>
      node
        ? placementOptions(tree, null, { asTargets: true, onlyActive: true, excludeIds: new Set([node.id]) })
        : [],
    [tree, node],
  )
  const count = (impact?.direct_products ?? 0) + (impact?.direct_mall_products ?? 0)

  async function submit() {
    setSaving(true)
    try {
      const res = await vm.moveProducts.mutateAsync({ id: node.id, targetId: target })
      message.success(t('categories.tree.movedProducts', { count: res?.moved_count ?? 0 }))
      onClose()
    } catch (e) {
      message.error(e?.message ?? t('shared.saveFailed', { defaultValue: 'Save failed' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('categories.tree.moveProductsTitle', { name: node?.name ?? '' })}
      open={open}
      onCancel={onClose}
      onOk={submit}
      okButtonProps={{ disabled: loading || !!error || !target || count === 0 }}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {error ? <Alert type="error" showIcon className="mb-4" title={error} /> : null}
        <p className="mb-3 text-sm text-slate-600">
          {count === 0
            ? t('categories.tree.moveProductsNone')
            : t('categories.tree.moveProductsHint', { count })}
        </p>
        <TreeSelect
          value={target}
          onChange={setTarget}
          treeData={targets}
          treeDefaultExpandAll
          showSearch
          treeNodeFilterProp="title"
          placeholder={t('categories.tree.targetPh')}
          className="w-full"
          disabled={count === 0}
        />
      </Spin>
    </Modal>
  )
}

// ── change section (roots only) ─────────────────────────────────────────────

export function CategoryChangeScopeModal({ open, node, scope, vm, onClose }) {
  const { t } = useTranslation('pages')
  const { previewScopeChange } = vm
  const [toScope, setToScope] = useState(/** @type {string | undefined} */ (undefined))
  const [preview, setPreview] = useState({ loading: false, data: null, error: null })
  const [confirmName, setConfirmName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setToScope(undefined)
    setPreview({ loading: false, data: null, error: null })
    setConfirmName('')
  }, [open, node])

  useEffect(() => {
    if (!open || !node || !toScope) return undefined
    let alive = true
    setPreview({ loading: true, data: null, error: null })
    previewScopeChange(node.id, toScope)
      .then((data) => alive && setPreview({ loading: false, data, error: null }))
      .catch((e) => alive && setPreview({ loading: false, data: null, error: e?.message ?? 'error' }))
    return () => {
      alive = false
    }
  }, [open, node, toScope, previewScopeChange])

  const nameMatches = node != null && confirmName.trim() === node.name

  async function submit() {
    setSaving(true)
    try {
      await vm.changeScope.mutateAsync({ id: node.id, toScope, confirmName: confirmName.trim() })
      message.success(t('categories.scopeMoved', { scope: t(`categories.scopes.${toScope}`) }))
      onClose()
    } catch (e) {
      message.error(e?.message ?? t('shared.saveFailed', { defaultValue: 'Save failed' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('categories.tree.changeScopeTitle', { name: node?.name ?? '' })}
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText={t('categories.tree.changeScopeOk')}
      okButtonProps={{ danger: true, disabled: !preview.data || !nameMatches }}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Alert type="warning" showIcon className="mb-4" title={t('categories.tree.changeScopeWarning')} />
      <Form layout="vertical">
        <Form.Item label={t('categories.tree.changeScopeTo')}>
          <Select
            value={toScope}
            onChange={setToScope}
            placeholder={t('categories.tree.changeScopeToPh')}
            options={CATEGORY_SCOPES.filter((s) => s !== scope).map((value) => ({
              value,
              label: t(`categories.scopes.${value}`),
            }))}
          />
        </Form.Item>
        <Spin spinning={preview.loading}>
          {preview.error ? <Alert type="error" showIcon className="mb-4" title={preview.error} /> : null}
          {preview.data ? (
            <>
              <ImpactSummary impact={preview.data.impact} t={t} />
              {preview.data.mismatched_products > 0 ? (
                <Alert
                  type="error"
                  showIcon
                  className="mb-4"
                  title={t('categories.tree.changeScopeMismatch', {
                    count: preview.data.mismatched_products,
                    scope: t(`categories.scopes.${toScope}`),
                  })}
                />
              ) : null}
              <Form.Item label={t('categories.tree.changeScopeConfirm', { name: node?.name ?? '' })}>
                <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
              </Form.Item>
            </>
          ) : null}
        </Spin>
      </Form>
    </Modal>
  )
}

// ── change log ──────────────────────────────────────────────────────────────

export function CategoryChangeLogDrawer({ open, scope, onClose }) {
  const { t, i18n } = useTranslation('pages')
  const query = useQuery({
    queryKey: [...queryKeys.categories.all(), 'change-log', scope],
    queryFn: ({ signal }) => listCategoryChangeLog({ scope, signal }),
    enabled: open,
  })
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }),
    [i18n.language],
  )
  const columns = [
    {
      title: t('categories.tree.logWhen'),
      dataIndex: 'created_at',
      key: 'when',
      width: 150,
      render: (v) => <span className="tabular-nums">{v ? fmt.format(new Date(v)) : ''}</span>,
    },
    {
      title: t('categories.tree.logAction'),
      dataIndex: 'action',
      key: 'action',
      width: 130,
      render: (a) => <Tag>{t(`categories.tree.actions.${a}`, { defaultValue: a })}</Tag>,
    },
    {
      title: t('categories.colCategory'),
      key: 'category',
      render: (_, r) => r.category_name || t('shared.emDash'),
    },
    {
      title: t('categories.tree.logActor'),
      dataIndex: 'actor_name',
      key: 'actor',
      width: 160,
      render: (v) => v || t('shared.emDash'),
    },
    {
      title: t('categories.tree.logDetails'),
      dataIndex: 'details',
      key: 'details',
      render: (d) => (
        <code className="text-xs break-all text-slate-500" dir="ltr">
          {d && Object.keys(d).length ? JSON.stringify(d) : ''}
        </code>
      ),
    },
  ]
  return (
    <Drawer
      title={t('categories.tree.logTitle', { scope: t(`categories.scopes.${scope}`) })}
      open={open}
      onClose={onClose}
      width={960}
      destroyOnHidden
    >
      {query.error ? <Alert type="error" showIcon className="mb-4" title={query.error.message} /> : null}
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={query.data ?? []}
        loading={query.isFetching}
        pagination={{ pageSize: 25 }}
      />
    </Drawer>
  )
}
