// View: banners — GET/POST/PATCH/DELETE /api/banners
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Form, Input, Modal, Space, Spin, Table, Tooltip, Upload, message } from 'antd'
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

export function BannersListPage() {
  const { t, i18n } = useTranslation('pages')
  const {
    banners,
    loading,
    error,
    refetch,
    createMutation,
    deleteMutation,
    replaceImageMutation,
  } = useBannersViewModel()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [createOpen, setCreateOpen] = useState(false)
  const [createFile, setCreateFile] = useState(/** @type {File | null} */ (null))
  const [form] = Form.useForm()

  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [replaceForId, setReplaceForId] = useState(/** @type {number | null} */ (null))
  const [replaceFile, setReplaceFile] = useState(/** @type {File | null} */ (null))

  const displayTotal = banners.length

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

  const submitCreate = useCallback(async () => {
    if (!createFile) {
      message.warning(t('banners.form.imageRequired'))
      return
    }
    try {
      await createMutation.mutateAsync({ image: createFile })
      message.success(t('banners.list.created'))
      setCreateOpen(false)
      setCreateFile(null)
      form.resetFields()
    } catch (e) {
      message.error(e?.message ?? t('banners.list.createFailed'))
    }
  }, [createFile, createMutation, form, t])

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
        width: 220,
        fixed: 'right',
        render: (_, row) => (
          <Space wrap size="small">
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
    [t, i18n.language, deletingId, handleDelete],
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
          <Button type="button" variant="primary" onClick={openCreate} className="inline-flex min-h-9 items-center gap-1">
            <PlusOutlined />
            {t('banners.list.newBanner')}
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table
            rowKey={(row) => bannerRowKey(row)}
            columns={columns}
            dataSource={banners}
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
        onCancel={() => {
          setCreateOpen(false)
          setCreateFile(null)
          form.resetFields()
        }}
        onOk={submitCreate}
        okText={t('shared.create')}
        confirmLoading={createMutation.isPending}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" className="pt-2">
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
          <Form.Item label={t('banners.form.link')} extra={t('banners.form.comingSoon')}>
            <Input disabled placeholder={t('banners.form.linkPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('banners.form.description')} extra={t('banners.form.comingSoon')}>
            <Input.TextArea disabled rows={2} placeholder={t('banners.form.descriptionPlaceholder')} />
          </Form.Item>
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
