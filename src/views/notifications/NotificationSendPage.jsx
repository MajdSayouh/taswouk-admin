import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Form, Input, Select, Spin, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useNotificationsViewModel } from '../../viewmodels/useNotificationsViewModel.js'
import { queryKeys } from '../../query/queryKeys.js'
import { fetchCustomerUserOptions } from './notificationRecipientUsers.js'
import {
  normalizeNotificationUserIds,
  parseOptionalNotificationData,
} from '../../utils/notificationPayload.js'

/** SendNotificationSchema.type — server default GENERAL. */
const SEND_NOTIFICATION_TYPE_OPTIONS = [
  { value: 'GENERAL', labelKey: 'notifications.send.types.GENERAL' },
  { value: 'ORDER_STATUS', labelKey: 'notifications.send.types.ORDER_STATUS' },
  { value: 'BROADCAST', labelKey: 'notifications.send.types.BROADCAST' },
]

export function NotificationSendPage() {
  const { t } = useTranslation('pages')
  const { sendToUsersMutation } = useNotificationsViewModel()
  const [form] = Form.useForm()

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers.byRole('CUSTOMER'),
    queryFn: fetchCustomerUserOptions,
  })

  const selectOptions = useMemo(() => {
    const rows = usersQuery.data ?? []
    return rows.map((u) => ({
      value: u.id,
      label: [u.label, u.email, u.phone].filter(Boolean).join(' · '),
    }))
  }, [usersQuery.data])

  const onFinish = useCallback(
    async (values) => {
      const userIds = normalizeNotificationUserIds(values.userIds)
      if (userIds.length === 0) {
        message.error(t('notifications.send.userRequired'))
        return
      }
      try {
        const data = parseOptionalNotificationData(values.dataJson)
        await sendToUsersMutation.mutateAsync({
          title: values.title.trim(),
          body: values.body.trim(),
          user_ids: userIds,
          type: values.notifyType ? String(values.notifyType).trim() : 'GENERAL',
          data,
        })
        message.success(t('notifications.send.success'))
        form.resetFields()
      } catch (e) {
        const detail = e && typeof e === 'object' && 'message' in e ? String(e.message) : ''
        message.error(detail ? `${t('notifications.send.error')} ${detail}` : t('notifications.send.error'))
      }
    },
    [form, sendToUsersMutation, t],
  )

  return (
    <div className="space-y-6">
      <div>
        <Link to="/notifications" className="text-sm font-medium text-[#FF7D29] hover:underline">
          ← {t('notifications.nav.backToLog')}
        </Link>
      </div>

      <Card title={t('notifications.send.cardTitle')}>
        {/* <p className="text-xs font-mono text-slate-500 mb-2">{t('notifications.send.apiPath')}</p>
        <p className="text-sm text-slate-600 mb-4">{t('notifications.send.hint')}</p> */}

        <Spin spinning={usersQuery.isLoading}>
          <Form
            form={form}
            layout="vertical"
            className="max-w-2xl"
            initialValues={{ notifyType: 'GENERAL' }}
            onFinish={(v) => void onFinish(v)}
          >
            <Form.Item
              name="userIds"
              label={t('notifications.send.userLabel')}
              rules={[{ required: true, message: t('notifications.send.userRequired') }]}
            >
              <Select
                mode="multiple"
                showSearch
                allowClear
                placeholder={t('notifications.send.userPlaceholder')}
                loading={usersQuery.isLoading}
                optionFilterProp="label"
                options={selectOptions}
                filterOption={(input, option) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(String(input).toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item
              name="title"
              label={t('notifications.broadcast.titleLabel')}
              rules={[{ required: true, message: t('notifications.broadcast.titleRequired') }]}
            >
              <Input maxLength={200} showCount />
            </Form.Item>
            <Form.Item
              name="body"
              label={t('notifications.broadcast.bodyLabel')}
              rules={[{ required: true, message: t('notifications.broadcast.bodyRequired') }]}
            >
              <Input.TextArea rows={6} maxLength={2000} showCount />
            </Form.Item>
            <Form.Item name="notifyType" label={t('notifications.send.typeLabel')} extra={t('notifications.send.typeExtra')}>
              <Select
                showSearch
                optionFilterProp="label"
                popupMatchSelectWidth={false}
                className="w-full max-w-md"
                options={SEND_NOTIFICATION_TYPE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: `${o.value} — ${t(o.labelKey)}`,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="dataJson"
              label={t('notifications.broadcast.dataJsonLabel')}
              extra={t('notifications.broadcast.dataJsonExtra')}
              rules={[
                {
                  validator: async (_, value) => {
                    try {
                      parseOptionalNotificationData(value)
                    } catch {
                      throw new Error(t('notifications.broadcast.dataJsonInvalid'))
                    }
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder={t('notifications.broadcast.dataJsonPlaceholder')}
              />
            </Form.Item>
            {usersQuery.isError ? (
              <Alert type="warning" showIcon className="mb-4" message={t('notifications.send.usersLoadError')} />
            ) : null}
            <Form.Item>
              <Button type="submit" disabled={sendToUsersMutation.isPending}>
                {sendToUsersMutation.isPending ? t('notifications.send.sending') : t('notifications.send.send')}
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  )
}
