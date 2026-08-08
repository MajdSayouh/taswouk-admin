// View: one role's users, server-side paginated — GET /api/accounts/admin/users/role/{role}.
// Backs the Users > Customers/Sellers/Delivery/Admins sidebar tabs.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Input, Spin, Table } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { DASHBOARD_TABLE_PROPS } from '../../components/tables/tableDefaults.js'
import { useUsersByRoleViewModel } from '../../viewmodels/useUsersByRoleViewModel.js'
import { buildBaseColumns, buildDeliveryExtraColumns, columnsForRole, matchesUserSearch } from './userColumns.jsx'

/**
 * @param {{ role: 'ADMIN' | 'CUSTOMER' | 'SELLER' | 'DELIVERY' }} props
 */
export function UsersByRolePage({ role }) {
  const { t } = useTranslation('pages')
  const { users, total, page, pageSize, setPage, loading, error, refetch } =
    useUsersByRoleViewModel(role)
  const [search, setSearch] = useState('')

  const baseColumns = useMemo(() => buildBaseColumns(t), [t])
  const deliveryExtraColumns = useMemo(() => buildDeliveryExtraColumns(t), [t])
  const columns = useMemo(
    () => columnsForRole(role, baseColumns, deliveryExtraColumns),
    [role, baseColumns, deliveryExtraColumns],
  )

  // Search only filters the rows already loaded for the current page — the full role
  // dataset isn't fetched at once (that's the whole point of server-side pagination).
  const filteredRows = useMemo(
    () => users.filter((row) => matchesUserSearch(row, search)),
    [users, search],
  )

  const roleLabel = t(`adminUsers.role.${role}`, { defaultValue: role })

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

      <Card title={t('adminUsers.roleTitle', { role: roleLabel, count: total })}>
        <Spin spinning={loading}>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                allowClear
                value={search}
                placeholder={t('adminUsers.searchPlaceholder')}
                className="w-full sm:max-w-md"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search ? (
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  {t('adminUsers.searchResults', {
                    shown: filteredRows.length,
                    total: users.length,
                  })}
                </span>
              ) : null}
            </div>
            <Table
              rowKey={(row) => String(row?.id)}
              columns={columns}
              dataSource={filteredRows}
              pagination={
                search
                  ? false // search narrows the current page only, so a second pager is confusing
                  : {
                      current: page,
                      pageSize,
                      total,
                      showSizeChanger: false,
                      onChange: setPage,
                    }
              }
              {...DASHBOARD_TABLE_PROPS}
            />
          </div>
        </Spin>
      </Card>
    </div>
  )
}
