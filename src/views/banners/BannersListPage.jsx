// View: banners — GET/POST/PATCH/DELETE /api/banners
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { useBannersViewModel } from '../../viewmodels/useBannersViewModel.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'

const DEFAULT_PAGE_SIZE = 10

function formatDateTime(iso, locale) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  try {
    return d.toLocaleString(locale)
  } catch {
    return d.toISOString()
  }
}

/**
 * @param {unknown} row
 */
function bannerRowKey(row) {
  return String(row?.id ?? '')
}

/** Blank strings become null so an emptied field is not sent as a value. */
function trimmedOrNull(value) {
  const v = value == null ? '' : String(value).trim()
  return v === '' ? null : v
}

function BannerActiveSwitch({ row, mutation, t }) {
  const pending =
    mutation.isPending &&
    mutation.variables != null &&
    String(mutation.variables.bannerId) === String(row?.id)
  // While saving show the requested state; the mutation settles only after the
  // list refetches, so the row already carries the saved value when it ends.
  const requested = mutation.variables?.payload?.is_active
  const checked = pending && requested !== undefined ? Boolean(requested) : Boolean(row?.is_active)
  return (
    <Switch
      checked={checked}
      loading={pending}
      disabled={pending}
      onChange={async (next) => {
        try {
          await mutation.mutateAsync({ bannerId: row.id, payload: { is_active: next } })
        } catch (e) {
          message.error(e?.message ?? t('banners.list.updateFailed'))
        }
      }}
    />
  )
}

/** Fields shared by the create and edit dialogs (everything except the image). */
function BannerFields({ t, placements, placementsLoading }) {
  return (
    <>
      <Form.Item
        name="placement"
        label={t('banners.form.placement')}
        rules={[{ required: true, message: t('banners.form.placementRequired') }]}
      >
        <Select
          loading={placementsLoading}
          placeholder={t('banners.form.placementPlaceholder')}
          options={placements.map((p) => ({ value: p.value, label: p.label }))}
        />
      </Form.Item>
      <Space size="large" align="start" wrap>
        <Form.Item name="sort_order" label={t('banners.form.sortOrder')} extra={t('banners.form.sortOrderHint')}>
          <InputNumber min={0} precision={0} className="w-32" />
        </Form.Item>
        <Form.Item name="is_active" label={t('banners.form.isActive')} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Space>
      <Form.Item
        name="link"
        label={t('banners.form.link')}
        extra={t('banners.form.linkHint')}
        rules={[{ type: 'url', message: t('banners.form.linkInvalid') }]}
      >
        <Input dir="ltr" placeholder={t('banners.form.linkPlaceholder')} allowClear />
      </Form.Item>
      <Form.Item name="description" label={t('banners.form.description')}>
        <Input.TextArea rows={2} maxLength={255} showCount placeholder={t('banners.form.descriptionPlaceholder')} />
      </Form.Item>
    </>
  )
}

export function BannersListPage() {
  const { t, i18n } = useTranslation('pages')
  const {
    banners,
    loading,
    error,
    refetch,
    placements,
    placementsLoading,
    createMutation,
    updateMutation,
    deleteMutation,
    replaceImageMutation,
  } = useBannersViewModel()

  const placementLabel = useCallback(
    (value) => placements.find((p) => p.value === value)?.label ?? value,
    [placements],
  )

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [placementFilter, setPlacementFilter] = useState(/** @type {string | null} */ (null))

  const [createOpen, setCreateOpen] = useState(false)
  const [createFile, setCreateFile] = useState(/** @type {File | null} */ (null))
  const [form] = Form.useForm()

  const [editing, setEditing] = useState(/** @type {any} */ (null))
  const [editForm] = Form.useForm()

  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [replaceForId, setReplaceForId] = useState(/** @type {number | null} */ (null))
  const [replaceFile, setReplaceFile] = useState(/** @type {File | null} */ (null))

  // Same order the app shows them in: by placement, then display order.
  const visibleBanners = useMemo(() => {
    const placementIndex = (value) => {
      const i = placements.findIndex((p) => p.value === value)
      return i === -1 ? placements.length : i
    }
    return banners
      .filter((b) => !placementFilter || b?.placement === placementFilter)
      .slice()
      .sort(
        (a, b) =>
          placementIndex(a?.placement) - placementIndex(b?.placement) ||
          (a?.sort_order ?? 0) - (b?.sort_order ?? 0) ||
          (b?.id ?? 0) - (a?.id ?? 0),
      )
  }, [banners, placements, placementFilter])

  const displayTotal = visibleBanners.length

  // The edit dialog can replace the image; read the refetched row so its preview follows.
  const editingRow = useMemo(
    () => (editing ? (banners.find((b) => b?.id === editing.id) ?? editing) : null),
    [banners, editing],
  )

  const handleDelete = useCallback(
    async (row) => {
      const id = row?.id
      if (id == null) return
      setDeletingId(String(id))
      try {
        await deleteMutation.mutateAsync(id)
        message.success(t('banners.list.deleted'))
      } catch (e) {
        message.error(e?.message ?? t('shared.deleteFailed'))
      } finally {
        setDeletingId(null)
      }
    },
    [deleteMutation, t],
  )

  const openCreate = useCallback(() => {
    setCreateFile(null)
    form.resetFields()
    setCreateOpen(true)
  }, [form])

  const closeCreate = useCallback(() => {
    setCreateOpen(false)
    setCreateFile(null)
    form.resetFields()
  }, [form])

  const submitCreate = useCallback(async () => {
    if (!createFile) {
      message.warning(t('banners.form.imageRequired'))
      return
    }
    let values
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    try {
      await createMutation.mutateAsync({
        image: createFile,
        placement: values.placement,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active !== false,
        link: trimmedOrNull(values.link),
        description: trimmedOrNull(values.description),
      })
      message.success(t('banners.list.created'))
      closeCreate()
    } catch (e) {
      message.error(e?.message ?? t('banners.list.createFailed'))
    }
  }, [createFile, createMutation, form, closeCreate, t])

  const openEdit = useCallback(
    (row) => {
      setEditing(row)
      editForm.setFieldsValue({
        placement: row?.placement,
        sort_order: row?.sort_order ?? 0,
        is_active: Boolean(row?.is_active),
        link: row?.link ?? '',
        description: row?.description ?? '',
      })
    },
    [editForm],
  )

  const closeEdit = useCallback(() => {
    setEditing(null)
    editForm.resetFields()
  }, [editForm])

  const submitEdit = useCallback(async () => {
    if (!editing) return
    let values
    try {
      values = await editForm.validateFields()
    } catch {
      return
    }
    try {
      await updateMutation.mutateAsync({
        bannerId: editing.id,
        payload: {
          placement: values.placement,
          sort_order: values.sort_order ?? 0,
          is_active: Boolean(values.is_active),
          // The API skips null fields, so an emptied field is sent as "" to clear it.
          link: trimmedOrNull(values.link) ?? '',
          description: trimmedOrNull(values.description) ?? '',
        },
      })
      message.success(t('banners.list.updated'))
      closeEdit()
    } catch (e) {
      message.error(e?.message ?? t('banners.list.updateFailed'))
    }
  }, [editing, editForm, updateMutation, closeEdit, t])

  const submitReplace = useCallback(async () => {
    if (replaceForId == null || !replaceFile) {
      message.warning(t('banners.form.imageRequired'))
      return
    }
    try {
      await replaceImageMutation.mutateAsync({ bannerId: replaceForId, file: replaceFile })
      message.success(t('banners.list.imageUpdated'))
      setReplaceForId(null)
      setReplaceFile(null)
    } catch (e) {
      message.error(e?.message ?? t('banners.list.replaceFailed'))
    }
  }, [replaceForId, replaceFile, replaceImageMutation, t])

  const columns = useMemo(
    () => [
      {
        title: t('banners.list.colImage'),
        key: 'image',
        width: 100,
        render: (_, row) => {
          const src = resolvePublicMediaUrl(row?.image)
          return src ? (
            <img
              src={src}
              alt=""
              className="h-14 w-28 rounded border border-slate-200 object-cover bg-slate-50"
            />
          ) : (
            <span className="text-slate-400">{t('shared.emDash')}</span>
          )
        },
      },
      {
        title: t('banners.list.colId'),
        key: 'id',
        width: 80,
        render: (_, row) => <span className="tabular-nums text-slate-700">{row?.id}</span>,
      },
      {
        title: t('banners.list.colLink'),
        key: 'link',
        ellipsis: true,
        render: (_, row) => {
          const v = row?.link
          const text = v != null && String(v).trim() !== '' ? String(v) : t('shared.emDash')
          return (
            <Tooltip title={text}>
              <span className="text-slate-600">{text}</span>
            </Tooltip>
          )
        },
      },
      {
        title: t('banners.list.colDescription'),
        key: 'description',
        ellipsis: true,
        render: (_, row) => {
          const v = row?.description
          const text = v != null && String(v).trim() !== '' ? String(v) : t('shared.emDash')
          return (
            <Tooltip title={text}>
              <span className="text-slate-600">{text}</span>
            </Tooltip>
          )
        },
      },
      {
        title: t('banners.list.colPlacement'),
        key: 'placement',
        width: 160,
        render: (_, row) => {
          const label = row?.placement_label || placementLabel(row?.placement)
          return label ? <Tag>{label}</Tag> : <span className="text-slate-400">{t('shared.emDash')}</span>
        },
      },
      {
        title: t('banners.list.colSortOrder'),
        key: 'sort_order',
        width: 90,
        render: (_, row) => <span className="tabular-nums text-slate-700">{row?.sort_order ?? 0}</span>,
      },
      {
        title: t('banners.list.colActive'),
        key: 'is_active',
        width: 90,
        render: (_, row) => <BannerActiveSwitch row={row} mutation={updateMutation} t={t} />,
      },
      {
        title: t('banners.list.colCreated'),
        key: 'created_at',
        width: 180,
        render: (_, row) => (
          <span className="text-sm text-slate-600">
            {formatDateTime(row?.created_at, i18n.language)}
          </span>
        ),
      },
      {
        title: t('shared.actions'),
        key: 'actions',
        width: 280,
        fixed: 'right',
        render: (_, row) => (
          <Space wrap size="small">
            <Button type="button" variant="secondary" className="text-xs" onClick={() => openEdit(row)}>
              {t('shared.edit')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                setReplaceForId(row?.id ?? null)
                setReplaceFile(null)
              }}
            >
              {t('banners.list.replaceImage')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-xs text-red-700 border-red-200 hover:bg-red-50"
              loading={deletingId === bannerRowKey(row)}
              onClick={() =>
                Modal.confirm({
                  title: t('banners.list.deleteTitle'),
                  content: t('banners.list.deleteDesc'),
                  okText: t('shared.delete'),
                  okButtonProps: { danger: true },
                  onOk: () => handleDelete(row),
                })
              }
            >
              {t('shared.delete')}
            </Button>
          </Space>
        ),
      },
    ],
    [t, i18n.language, deletingId, handleDelete, placementLabel, updateMutation, openEdit],
  )

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title={t('banners.list.loadError')}
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}

      <Card
        title={t('banners.list.title', { count: displayTotal })}
        actions={
          <Space wrap>
            <Select
              allowClear
              value={placementFilter}
              onChange={(v) => {
                setPlacementFilter(v ?? null)
                setPage(1)
              }}
              loading={placementsLoading}
              placeholder={t('banners.list.allPlacements')}
              options={placements.map((p) => ({ value: p.value, label: p.label }))}
              className="min-w-48"
            />
            <Button type="button" variant="primary" onClick={openCreate} className="inline-flex min-h-9 items-center gap-1">
              <PlusOutlined />
              {t('banners.list.newBanner')}
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table
            rowKey={(row) => bannerRowKey(row)}
            columns={columns}
            dataSource={visibleBanners}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total: displayTotal,
              showTotal: (total) => t('banners.list.pagination', { count: total }),
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            })}
            {...DASHBOARD_TABLE_PROPS}
          />
        </Spin>
      </Card>

      <Modal
        title={t('banners.form.createTitle')}
        open={createOpen}
        onCancel={closeCreate}
        onOk={submitCreate}
        okText={t('shared.create')}
        confirmLoading={createMutation.isPending}
        destroyOnHidden
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          className="pt-2"
          initialValues={{ placement: placementFilter ?? undefined, sort_order: 0, is_active: true }}
        >
          <Form.Item label={t('banners.form.image')} required>
            <Upload
              accept="image/*"
              maxCount={1}
              beforeUpload={(file) => {
                setCreateFile(file)
                return false
              }}
              onRemove={() => setCreateFile(null)}
              fileList={
                createFile
                  ? [{ uid: '-1', name: createFile.name, status: 'done' }]
                  : []
              }
            >
              <Button type="button" variant="secondary">
                {t('banners.form.selectFile')}
              </Button>
            </Upload>
          </Form.Item>
          <BannerFields t={t} placements={placements} placementsLoading={placementsLoading} />
        </Form>
      </Modal>

      <Modal
        title={t('banners.form.editTitle', { id: editing?.id ?? '' })}
        open={editing != null}
        onCancel={closeEdit}
        onOk={submitEdit}
        okText={t('shared.save')}
        confirmLoading={updateMutation.isPending}
        forceRender
        width={520}
      >
        {editingRow ? (
          <div className="mb-3 flex items-center gap-3">
            {resolvePublicMediaUrl(editingRow.image) ? (
              <img
                src={resolvePublicMediaUrl(editingRow.image)}
                alt=""
                className="h-16 w-32 rounded border border-slate-200 object-cover bg-slate-50"
              />
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => {
                setReplaceForId(editing.id)
                setReplaceFile(null)
              }}
            >
              {t('banners.list.replaceImage')}
            </Button>
          </div>
        ) : null}
        <Form form={editForm} layout="vertical">
          <BannerFields t={t} placements={placements} placementsLoading={placementsLoading} />
        </Form>
      </Modal>

      <Modal
        title={t('banners.form.replaceTitle')}
        open={replaceForId != null}
        onCancel={() => {
          setReplaceForId(null)
          setReplaceFile(null)
        }}
        onOk={submitReplace}
        okText={t('banners.list.replaceImage')}
        confirmLoading={replaceImageMutation.isPending}
        destroyOnHidden
      >
        <p className="text-sm text-slate-600 mb-3">
          {t('banners.form.replaceHint', { id: replaceForId ?? '' })}
        </p>
        <Upload
          accept="image/*"
          maxCount={1}
          beforeUpload={(file) => {
            setReplaceFile(file)
            return false
          }}
          onRemove={() => setReplaceFile(null)}
          fileList={
            replaceFile
              ? [{ uid: '-1', name: replaceFile.name, status: 'done' }]
              : []
          }
        >
          <Button type="button" variant="secondary">
            {t('banners.form.selectFile')}
          </Button>
        </Upload>
      </Modal>
    </div>
  )
}
