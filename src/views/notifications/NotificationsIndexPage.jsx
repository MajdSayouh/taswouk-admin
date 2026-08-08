// Notification log first; actions link to broadcast / send-to-user routes.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Alert, Button as AntButton, Spin, Table, Tag, message } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { buildDashboardPagination, DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { useNotificationsViewModel } from '../../viewmodels/useNotificationsViewModel.js'

const DEFAULT_PAGE_SIZE = 10

function formatDateTime(iso, locale) {
  if (!iso) return '—'
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) return String(iso)
  try {
    return d.toLocaleString(locale)
  } catch {
    return d.toISOString()
  }
}

export function NotificationsIndexPage() {
  const { t, i18n } = useTranslation('pages')
  const { notifications, loading, error, refetch, markReadMutation } = useNotificationsViewModel()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const displayTotal = notifications.length

  useEffect(() => {
    setPage(1)
  }, [displayTotal])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(displayTotal / pageSize) || 1)
    if (page > maxPage) setPage(maxPage)
  }, [displayTotal, pageSize, page])

  const slice = useMemo(() => {
    const start = (page - 1) * pageSize
    return notifications.slice(start, start + pageSize)
  }, [notifications, page, pageSize])

  const columns = useMemo(
    () => [
      {
        title: t('notifications.table.id'),
        dataIndex: 'id',
        key: 'id',
        width: 80,
        render: (v) => <span className="tabular-nums text-slate-700">{v}</span>,
      },
      {
        title: t('notifications.table.createdAt'),
        dataIndex: 'created_at',
        key: 'created_at',
        width: 180,
        render: (v) => (
          <span className="text-slate-600 text-sm whitespace-nowrap">
            {formatDateTime(v, i18n.language)}
          </span>
        ),
      },
      {
        title: t('notifications.table.title'),
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        render: (v) => <span className="font-medium text-slate-900">{v}</span>,
      },
      {
        title: t('notifications.table.body'),
        dataIndex: 'body',
        key: 'body',
        ellipsis: true,
        render: (v) => <span className="text-slate-600">{v}</span>,
      },
      {
        title: t('notifications.table.type'),
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (v) => {
          const key = String(v ?? '').toUpperCase()
          const color =
            key === 'GENERAL'
              ? 'orange'
              : key.includes('BROADCAST')
                ? 'purple'
                : key.includes('ORDER')
                  ? 'cyan'
                  : undefined
          return <Tag color={color}>{String(v ?? '—')}</Tag>
        },
      },
      {
        title: t('notifications.table.status'),
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (v) => {
          const s = String(v || '').toUpperCase()
          const color =
            s === 'SENT' ? 'green' : s === 'FAILED' ? 'red' : s === 'PENDING' ? 'gold' : 'default'
          return <Tag color={color}>{s || '—'}</Tag>
        },
      },
      {
        title: t('notifications.table.read'),
        dataIndex: 'is_read',
        key: 'is_read',
        width: 100,
        render: (v) => {
          const read = Boolean(v)
          return (
            <Tag color={read ? 'default' : 'blue'}>
              {read ? t('notifications.read.yes') : t('notifications.read.no')}
            </Tag>
          )
        },
      },
      {
        title: t('notifications.table.error'),
        dataIndex: 'error',
        key: 'error',
        width: 220,
        ellipsis: true,
        render: (value) =>
          value ? <span className="text-sm text-red-600">{String(value)}</span> : <span>—</span>,
      },
      {
        title: t('notifications.table.actions'),
        key: 'actions',
        width: 148,
        align: 'center',
        fixed: 'right',
        render: (_, record) => {
          const id = Number(record.id)
          const read = Boolean(record.is_read)
          if (!Number.isInteger(id) || id <= 0 || read) {
            return <span className="text-slate-300 text-xs">—</span>
          }
          return (
            <AntButton
              type="default"
              size="small"
              icon={<CheckCircleOutlined className="text-[#FF7D29]" />}
              loading={markReadMutation.isPending && markReadMutation.variables === id}
              className="!rounded-full !px-3 !h-8 !border-slate-200 !text-slate-700 !bg-white hover:!border-[#FF7D29] hover:!text-[#FF7D29] !shadow-sm !font-medium !inline-flex !items-center !gap-1.5"
              onClick={async () => {
                try {
                  await markReadMutation.mutateAsync(id)
                  message.success(t('notifications.markReadSuccess'))
                } catch (e) {
                  const detail = e && typeof e === 'object' && 'message' in e ? String(e.message) : ''
                  message.error(
                    detail ? `${t('notifications.markReadError')} ${detail}` : t('notifications.markReadError'),
                  )
                }
              }}
            >
              {t('notifications.markRead')}
            </AntButton>
          )
        },
      },
    ],
    [markReadMutation, t, i18n.language],
  )

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          showIcon
          title={t('notifications.loadErrorTitle')}
          description={error}
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('notifications.log.cardTitle')}</h2>
            <p className="text-xs text-slate-500 mt-1">{t('notifications.index.tableLead')}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end shrink-0">
            <Button as={Link} to="/notifications/broadcast" variant="secondary">
              {t('notifications.nav.broadcast')}
            </Button>
            <Button as={Link} to="/notifications/send" variant="primary">
              {t('notifications.nav.sendUser')}
            </Button>
          </div>
        </div>
        <Spin spinning={loading}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={slice}
            scroll={DASHBOARD_TABLE_PROPS.scroll}
            pagination={buildDashboardPagination({
              page,
              pageSize,
              total: displayTotal,
              showTotal: (total) => t('notifications.log.pagination', { count: total }),
              onChange: (p, ps) => {
                setPage(p)
                setPageSize(ps)
              },
            })}
            size={DASHBOARD_TABLE_PROPS.size}
          />
        </Spin>
      </Card>
    </div>
  )
}
