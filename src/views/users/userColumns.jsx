// Shared table column builders for the admin users views (all-roles accordion + per-role tabs).
import { Tag } from 'antd'

export function fullName(row) {
  const a = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim()
  return a || row?.full_name || row?.name || '—'
}

export function matchesUserSearch(row, query) {
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

/** @param {(key: string, opts?: object) => string} t */
export function buildBaseColumns(t) {
  return [
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
  ]
}

/** @param {(key: string, opts?: object) => string} t */
export function buildDeliveryExtraColumns(t) {
  return [
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
  ]
}

export function columnsForRole(role, baseColumns, deliveryExtraColumns) {
  return role === 'DELIVERY' ? [...baseColumns, ...deliveryExtraColumns] : baseColumns
}
