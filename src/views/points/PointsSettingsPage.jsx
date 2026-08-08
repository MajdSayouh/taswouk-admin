// View: admin points earn-rate settings — GET/PUT /api/accounts/admin/points/settings
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Form, InputNumber, Spin, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { usePointsSettingsViewModel } from '../../viewmodels/usePointsSettingsViewModel.js'

export function PointsSettingsPage() {
  const { t } = useTranslation('pages')
  const { settings, loading, error, refetch, updateMutation } = usePointsSettingsViewModel()
  const [form] = Form.useForm()

  useEffect(() => {
    if (settings && typeof settings.points_per_amount === 'number') {
      form.setFieldsValue({ points_per_amount: settings.points_per_amount })
    }
  }, [settings, form])

  async function onFinish(values) {
    try {
      await updateMutation.mutateAsync({
        points_per_amount: values.points_per_amount,
      })
      form.setFieldsValue(values)
      message.success(t('points.saved'))
    } catch (e) {
      message.error(e?.message ?? t('points.saveFailed'))
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          type="error"
          title={t('points.loadError')}
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}

      <Card title={t('points.title')}>
        <Spin spinning={loading}>
          <p className="text-sm text-slate-600 mb-6 max-w-xl">{t('points.intro')}</p>
          <Form
            form={form}
            layout="vertical"
            className="max-w-md"
            onFinish={onFinish}
            initialValues={{ points_per_amount: 1 }}
          >
            <Form.Item
              name="points_per_amount"
              label={t('points.fieldPointsPerAmount')}
              rules={[
                { required: true, message: t('points.required') },
                {
                  type: 'number',
                  min: 1,
                  message: t('points.minOne'),
                },
              ]}
            >
              <InputNumber className="w-full" min={1} precision={0} />
            </Form.Item>
            <Form.Item>
              <Button
                type="submit"
                variant="primary"
                loading={updateMutation.isPending}
                disabled={loading && !settings}
              >
                {t('shared.save')}
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  )
}
