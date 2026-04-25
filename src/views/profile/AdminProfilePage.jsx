// Admin profile — GET /api/accounts/auth/me (session user).
import { useQuery } from '@tanstack/react-query'
import { Descriptions, Tag, Spin, Alert, Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { getProfile } from '../../services/authService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { Card } from '../../components/ui/Card'

function display(v) {
  if (v == null || v === '') return '—'
  return String(v)
}

function roleTag(role) {
  const r = String(role ?? '').toUpperCase()
  const color =
    r.includes('ADMIN') ? 'orange' : r.includes('SELLER') ? 'blue' : 'default'
  return (
    <Tag color={color} style={{ marginInlineEnd: 0 }}>
      {display(role)}
    </Tag>
  )
}

export function AdminProfilePage() {
  const query = useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: getProfile,
  })

  const p = query.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Your profile</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Loaded from <code className="text-xs bg-slate-100 px-1 rounded">GET /api/accounts/auth/me</code>
          </p>
        </div>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          loading={query.isFetching}
          onClick={() => query.refetch()}
        >
          Refresh
        </Button>
      </div>

      {query.error ? (
        <Alert
          type="error"
          title="Could not load profile"
          description={query.error?.message ?? 'Request failed'}
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <Spin spinning={query.isLoading}>
        <Card title="Account">
          {!p && !query.isLoading ? (
            <p className="text-sm text-slate-500">No profile data.</p>
          ) : p ? (
            <Descriptions bordered size="middle" column={{ xs: 1, sm: 1, md: 2 }} labelStyle={{ width: 180 }}>
              <Descriptions.Item label="User ID">{display(p.id)}</Descriptions.Item>
              <Descriptions.Item label="Role">{roleTag(p.role)}</Descriptions.Item>
              <Descriptions.Item label="Email">{display(p.email)}</Descriptions.Item>
              <Descriptions.Item label="Phone">{display(p.phone)}</Descriptions.Item>
              <Descriptions.Item label="First name">{display(p.first_name)}</Descriptions.Item>
              <Descriptions.Item label="Last name">{display(p.last_name)}</Descriptions.Item>
              <Descriptions.Item label="Governorate">{display(p.governorate)}</Descriptions.Item>
              <Descriptions.Item label="Active">
                {p.is_active ? (
                  <Tag color="green">Yes</Tag>
                ) : (
                  <Tag>No</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Verified">
                {p.is_verified ? (
                  <Tag color="cyan">Verified</Tag>
                ) : (
                  <Tag>Not verified</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Vehicle type">{display(p.vehicle_type)}</Descriptions.Item>
              <Descriptions.Item label="License number">{display(p.license_number)}</Descriptions.Item>
              <Descriptions.Item label="Available">
                {p.is_available ? (
                  <Tag color="green">Yes</Tag>
                ) : (
                  <Tag>No</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
      </Spin>
    </div>
  )
}
