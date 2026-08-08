// View: admin users — GET /api/accounts/admin/users/role/{role} × 4, grouped by role.
// Legacy all-roles accordion view. The routed Users sidebar tabs use UsersByRolePage instead,
// which paginates server-side so large roles (e.g. 500+ customers) aren't truncated.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Collapse, Input, Spin, Table } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { useAdminUsersViewModel } from '../../viewmodels/useAdminUsersViewModel.js'
import { buildBaseColumns, buildDeliveryExtraColumns, columnsForRole, matchesUserSearch } from './userColumns.jsx'

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

export function AdminUsersPage() {
  const { t } = useTranslation('pages')
  const { users, count, loading, error, refetch } = useAdminUsersViewModel()

  const byRole = useMemo(() => groupUsersByRole(users), [users])
  const baseColumns = useMemo(() => buildBaseColumns(t), [t])
  const deliveryExtraColumns = useMemo(() => buildDeliveryExtraColumns(t), [t])

  const collapseItems = useMemo(() => {
    const extraRoles = Object.keys(byRole).filter((r) => !ROLE_ORDER.includes(r))
    const order = [...ROLE_ORDER, ...extraRoles.sort()]
    return order.map((r) => {
      const rows = byRole[r] ?? []
      const roleLabelKey = `adminUsers.role.${r}`
      const roleLabel = t(roleLabelKey, { defaultValue: r })
      const cols = columnsForRole(r, baseColumns, deliveryExtraColumns)
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

  return (
    <div className="space-y-6">
      {error ? (
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
      ) : null}

      <Card title={t('adminUsers.title', { count })}>
        <Spin spinning={loading}>
          <p className="text-sm text-slate-600 mb-4">{t('adminUsers.intro')}</p>
          <Collapse defaultActiveKey={ROLE_ORDER} items={collapseItems} />
        </Spin>
      </Card>
    </div>
  )
}
