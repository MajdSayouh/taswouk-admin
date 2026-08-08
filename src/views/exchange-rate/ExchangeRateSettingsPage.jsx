import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, InputNumber, Select, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useExchangeRateSettingsViewModel } from '../../viewmodels/useExchangeRateSettingsViewModel.js'

const CURRENCY_OPTIONS = [
  { value: 'usd', i18nKey: 'exchangeRate.currency.usd' },
  { value: 'syp', i18nKey: 'exchangeRate.currency.syp' },
]

export function ExchangeRateSettingsPage() {
  const { t } = useTranslation('pages')
  const { updateMutation } = useExchangeRateSettingsViewModel()
  const [form] = Form.useForm()
  const currency = Form.useWatch('currency', form) ?? 'syp'

  useEffect(() => {
    if (currency === 'syp') {
      form.setFieldValue('exchange_rate', 1)
    }
  }, [currency, form])

  async function onFinish(values) {
    const exchangeRate = values.currency === 'syp' ? 1 : Number(values.exchange_rate)
    if (!Number.isInteger(exchangeRate) || exchangeRate < 1) {
      message.error(t('exchangeRate.exchangeRateInvalid'))
      return
    }
    try {
      await updateMutation.mutateAsync({ exchange_rate: exchangeRate })
      form.setFieldValue('exchange_rate', exchangeRate)
      message.success(t('exchangeRate.saved'))
    } catch (err) {
      message.error(err?.message ?? t('exchangeRate.saveFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <Card title={t('exchangeRate.title')}>
        <p className="text-sm text-slate-600 mb-6 max-w-xl">{t('exchangeRate.intro')}</p>
        <Form
          form={form}
          layout="vertical"
          className="max-w-md"
          onFinish={onFinish}
          initialValues={{ currency: 'syp', exchange_rate: 1 }}
        >
          <Form.Item
            name="currency"
            label={t('exchangeRate.fieldCurrency')}
            rules={[{ required: true, message: t('exchangeRate.currencyRequired') }]}
          >
            <Select
              options={CURRENCY_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.i18nKey),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="exchange_rate"
            label={t('exchangeRate.fieldRate')}
            rules={[
              {
                validator: (_, value) => {
                  if (currency === 'syp') return Promise.resolve()
                  if (Number.isInteger(value) && Number(value) >= 1) return Promise.resolve()
                  return Promise.reject(new Error(t('exchangeRate.exchangeRateInvalid')))
                },
              },
            ]}
          >
            <InputNumber
              className="w-full"
              min={1}
              precision={0}
              disabled={currency === 'syp'}
            />
          </Form.Item>

          <p className="text-xs text-slate-500 -mt-2 mb-4">
            {currency === 'syp'
              ? t('exchangeRate.sypHint')
              : t('exchangeRate.usdHint')}
          </p>

          <Form.Item className="mb-0">
            <Button type="submit" variant="primary" loading={updateMutation.isPending}>
              {t('shared.save')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
