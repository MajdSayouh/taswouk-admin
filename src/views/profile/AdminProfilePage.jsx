// Admin profile — GET /api/accounts/auth/me (session user).
import { Trans, useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Descriptions, Tag, Spin, Alert, Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { getProfile } from '../../services/authService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { Card } from '../../components/ui/Card'

function display(v, emDash) {
  if (v == null || v === '') return emDash
  return String(v)
}

function roleTag(role) {
  const r = String(role ?? '').toUpperCase()
  const color =
    r.includes('ADMIN') ? 'orange' : r.includes('SELLER') ? 'blue' : 'default'
  return (
    <Tag color={color} style={{ marginInlineEnd: 0 }}>
      {display(role, '—')}
    </Tag>
  )
}

export function AdminProfilePage() {
  const { t } = useTranslation('pages')
  const query = useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: getProfile,
  })

  const p = query.data
  const em = t('shared.emDash')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('profile.heading')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            <Trans
              ns="pages"
              i18nKey="profile.subheading"
              components={{
                code: <code className="text-xs bg-slate-100 px-1 rounded" />,
              }}
            />
          </p>
        </div>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          loading={query.isFetching}
          onClick={() => query.refetch()}
        >
          {t('profile.refresh')}
        </Button>
      </div>

      {query.error ? (
        <Alert
          type="error"
          title={t('profile.loadError')}
          description={query.error?.message ?? t('profile.requestFailed')}
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => query.refetch()}>
              {t('profile.retry')}
            </Button>
          }
        />
      ) : null}

      <Spin spinning={query.isLoading}>
        <Card title={t('profile.accountCard')}>
          {!p && !query.isLoading ? (
            <p className="text-sm text-slate-500">{t('profile.noData')}</p>
          ) : p ? (
            <Descriptions bordered size="middle" column={{ xs: 1, sm: 1, md: 2 }} labelStyle={{ width: 180 }}>
              <Descriptions.Item label={t('profile.userId')}>{display(p.id, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.role')}>{roleTag(p.role)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.email')}>{display(p.email, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.phone')}>{display(p.phone, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.firstName')}>{display(p.first_name, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.lastName')}>{display(p.last_name, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.governorate')}>{display(p.governorate, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.active')}>
                {p.is_active ? (
                  <Tag color="green">{t('shared.yes')}</Tag>
                ) : (
                  <Tag>{t('shared.no')}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.verified')}>
                {p.is_verified ? (
                  <Tag color="cyan">{t('profile.verified')}</Tag>
                ) : (
                  <Tag>{t('profile.notVerified')}</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('profile.vehicleType')}>{display(p.vehicle_type, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.licenseNumber')}>{display(p.license_number, em)}</Descriptions.Item>
              <Descriptions.Item label={t('profile.available')}>
                {p.is_available ? (
                  <Tag color="green">{t('shared.yes')}</Tag>
                ) : (
                  <Tag>{t('shared.no')}</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
      </Spin>
    </div>
  )
}
