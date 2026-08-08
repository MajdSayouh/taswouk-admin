// View: admin users — GET /api/accounts/admin/users, grouped by role
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Collapse, Input, Spin, Table, Tag } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { useAdminUsersViewModel } from '../../viewmodels/useAdminUsersViewModel.js'

/** @type {const} */
const ROLE_ORDER = ['ADMIN', 'CUSTOMER', 'SELLER', 'DELIVERY']

/**
 * @param {unknown[]} users
 * @returns {Record<string, unknown[]>}
 */
function groupUsersByRole(users) {
  /** @type {Record<string, unknown[]>} */
  const map = {}
  for (const r of ROLE_ORDER) {
    map[r] = []
  }
  for (const u of users) {
    const roleRaw = typeof u?.role === 'string' ? String(u.role).toUpperCase() : ''
    const role = roleRaw || 'UNKNOWN'
    if (!map[role]) map[role] = []
    map[role].push(u)
  }
  return map
}

function fullName(row) {
  const a = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim()
  return a || row?.full_name || row?.name || '—'
}

function matchesUserSearch(row, query) {
  const normalized = String(query ?? '').trim().toLowerCase()
  if (!normalized) return true
  return [
    row?.id,
    row?.user_id,
    row?.first_name,
    row?.last_name,
    row?.full_name,
    row?.name,
    fullName(row),
    row?.phone,
    row?.phone_number,
    row?.mobile,
  ].some((value) => String(value ?? '').toLowerCase().includes(normalized))
}

function RoleUsersTable({ rows, columns, t }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesUserSearch(row, search)),
    [rows, search],
  )
  const pageSize = 50
  const maxPage = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, maxPage)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          allowClear
          value={search}
          placeholder={t('adminUsers.searchPlaceholder')}
          className="w-full sm:max-w-md"
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <span className="shrink-0 text-xs tabular-nums text-slate-500">
          {t('adminUsers.searchResults', {
            shown: filteredRows.length,
            total: rows.length,
          })}
        </span>
      </div>
      <Table
        rowKey={(row) => String(row?.id)}
        columns={columns}
        dataSource={filteredRows}
        pagination={
          filteredRows.length > pageSize
            ? {
                current: currentPage,
                pageSize,
                showSizeChanger: false,
                onChange: setPage,
              }
            : false
        }
        {...DASHBOARD_TABLE_PROPS}
      />
    </div>
  )
}

/**
 * @param {{ role?: 'ADMIN' | 'CUSTOMER' | 'SELLER' | 'DELIVERY' }} [props]
 *   When `role` is given, only that role's table is rendered (used by the
 *   Users > Customers/Sellers/Delivery/Admins sidebar sub-tabs). Omit it to
 *   render the original all-roles accordion view.
 */
export function AdminUsersPage({ role } = {}) {
  const { t } = useTranslation('pages')
  const { users, count, loading, error, refetch } = useAdminUsersViewModel()

  const byRole = useMemo(() => groupUsersByRole(users), [users])

  const baseColumns = useMemo(
    () => [
      {
        title: t('adminUsers.colId'),
        dataIndex: 'id',
        key: 'id',
        width: 72,
        render: (id) => <span className="tabular-nums text-slate-800">{id}</span>,
      },
      {
        title: t('adminUsers.colName'),
        key: 'name',
        render: (_, row) => <span className="text-slate-800">{fullName(row)}</span>,
      },
      {
        title: t('adminUsers.colPhone'),
        dataIndex: 'phone',
        key: 'phone',
        render: (v) => v || '—',
      },
      {
        title: t('adminUsers.colEmail'),
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
        render: (v) => v || '—',
      },
      {
        title: t('adminUsers.colGovernorate'),
        dataIndex: 'governorate',
        key: 'governorate',
        width: 120,
        render: (v) => v || '—',
      },
      {
        title: t('shared.status'),
        key: 'is_active',
        width: 100,
        render: (_, row) =>
          row?.is_active ? (
            <Tag color="green">{t('shared.active')}</Tag>
          ) : (
            <Tag>{t('shared.inactive')}</Tag>
          ),
      },
      {
        title: t('adminUsers.colVerified'),
        key: 'is_verified',
        width: 100,
        render: (_, row) =>
          row?.is_verified ? (
            <Tag color="blue">{t('shared.yes')}</Tag>
          ) : (
            <Tag>{t('shared.no')}</Tag>
          ),
      },
    ],
    [t],
  )

  const deliveryExtraColumns = useMemo(
    () => [
      {
        title: t('adminUsers.colVehicle'),
        dataIndex: 'vehicle_type',
        key: 'vehicle_type',
        width: 120,
        render: (v) => v || '—',
      },
      {
        title: t('adminUsers.colLicense'),
        dataIndex: 'license_number',
        key: 'license_number',
        width: 120,
        render: (v) => v || '—',
      },
      {
        title: t('adminUsers.colAvailable'),
        key: 'is_available',
        width: 110,
        render: (_, row) => {
          if (row?.is_available == null) return '—'
          return row.is_available ? (
            <Tag color="cyan">{t('shared.yes')}</Tag>
          ) : (
            <Tag>{t('shared.no')}</Tag>
          )
        },
      },
    ],
    [t],
  )

  const collapseItems = useMemo(() => {
    const extraRoles = Object.keys(byRole).filter((r) => !ROLE_ORDER.includes(r))
    const order = [...ROLE_ORDER, ...extraRoles.sort()]
    return order.map((r) => {
      const rows = byRole[r] ?? []
      const roleLabelKey = `adminUsers.role.${r}`
      const roleLabel = t(roleLabelKey, { defaultValue: r })
      const cols = r === 'DELIVERY' ? [...baseColumns, ...deliveryExtraColumns] : baseColumns
      return {
        key: r,
        label: (
          <span className="font-medium text-slate-900">
            {roleLabel}{' '}
            <span className="text-slate-500 font-normal tabular-nums">({rows.length})</span>
          </span>
        ),
        children: <RoleUsersTable rows={rows} columns={cols} t={t} />,
      }
    })
  }, [byRole, baseColumns, deliveryExtraColumns, t])

  const errorAlert = error ? (
    <Alert
      type="error"
      title={t('adminUsers.loadError')}
      description={error}
      showIcon
      action={
        <Button type="button" variant="ghost" onClick={() => refetch()}>
          {t('shared.retry')}
        </Button>
      }
    />
  ) : null

  if (role) {
    const rows = byRole[role] ?? []
    const roleLabel = t(`adminUsers.role.${role}`, { defaultValue: role })
    const cols = role === 'DELIVERY' ? [...baseColumns, ...deliveryExtraColumns] : baseColumns
    return (
      <div className="space-y-6">
        {errorAlert}
        <Card title={t('adminUsers.roleTitle', { role: roleLabel, count: rows.length })}>
          <Spin spinning={loading}>
            <RoleUsersTable rows={rows} columns={cols} t={t} />
          </Spin>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {errorAlert}

      <Card title={t('adminUsers.title', { count })}>
        <Spin spinning={loading}>
          <p className="text-sm text-slate-600 mb-4">{t('adminUsers.intro')}</p>
          <Collapse defaultActiveKey={ROLE_ORDER} items={collapseItems} />
        </Spin>
      </Card>
    </div>
  )
}
