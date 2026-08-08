import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Alert, Form, Input, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useNotificationsViewModel } from '../../viewmodels/useNotificationsViewModel.js'
import { parseOptionalNotificationData } from '../../utils/notificationPayload.js'

export function NotificationBroadcastPage() {
  const { t } = useTranslation('pages')
  const { broadcastMutation } = useNotificationsViewModel()
  const [form] = Form.useForm()

  const onFinish = useCallback(
    async (values) => {
      try {
        const data = parseOptionalNotificationData(values.dataJson)
        await broadcastMutation.mutateAsync({
          title: values.title.trim(),
          body: values.body.trim(),
          data,
        })
        message.success(t('notifications.broadcast.success'))
        form.resetFields()
      } catch (e) {
        const detail = e && typeof e === 'object' && 'message' in e ? String(e.message) : ''
        message.error(detail ? `${t('notifications.broadcast.error')} ${detail}` : t('notifications.broadcast.error'))
      }
    },
    [broadcastMutation, form, t],
  )

  return (
    <div className="space-y-6">
      <div>
        <Link to="/notifications" className="text-sm font-medium text-[#FF7D29] hover:underline">
          ← {t('notifications.nav.backToLog')}
        </Link>
      </div>

      <Card title={t('notifications.broadcast.cardTitle')}>
        {/* <p className="text-xs font-mono text-slate-500 mb-2">{t('notifications.broadcast.apiPath')}</p>
        <Alert type="info" showIcon className="mb-4" message={t('notifications.broadcast.noTokensHintTitle')} description={t('notifications.broadcast.noTokensHintDesc')} />
        <p className="text-sm text-slate-600 mb-4">{t('notifications.broadcast.hint')}</p> */}
        <Form form={form} layout="vertical" className="max-w-2xl" onFinish={(v) => void onFinish(v)}>
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
          <Form.Item>
            <Button type="submit" disabled={broadcastMutation.isPending}>
              {broadcastMutation.isPending ? t('notifications.broadcast.sending') : t('notifications.broadcast.send')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
