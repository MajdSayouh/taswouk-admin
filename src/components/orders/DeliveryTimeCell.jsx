import { CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  deliveryDurationMinutes,
  parseInstant,
  partsDeliveryProgress,
  splitDuration,
} from '../../utils/deliveryTime.js'

/**
 * Formats a duration in minutes as "1ي 2س 5د" (or the English equivalent).
 * @param {number | null} minutes
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 */
export function formatDeliveryDuration(minutes, t) {
  const parts = splitDuration(minutes)
  if (!parts) return null
  const out = []
  if (parts.days) out.push(t('orders.durationDays', { count: parts.days }))
  if (parts.hours) out.push(t('orders.durationHours', { count: parts.hours }))
  if (parts.minutes || out.length === 0) out.push(t('orders.durationMinutes', { count: parts.minutes }))
  return out.join(' ')
}

/**
 * «وقت التسليم» for one order row: the time the driver confirmed delivery in the
 * delivery app, and how long it took from the order being placed.
 *
 * @param {{ order: { status: string; createdAt?: string; deliveredAt?: string | null; isSplit?: boolean; parts?: { status: string; sellerName?: string; deliveredAt?: string | null }[] } }} props
 */
export function DeliveryTimeCell({ order }) {
  const { t } = useTranslation('pages')
  const deliveredAt = parseInstant(order.deliveredAt)

  if (deliveredAt) {
    const duration = formatDeliveryDuration(
      deliveryDurationMinutes(order.createdAt, order.deliveredAt),
      t,
    )
    return (
      <Tooltip title={t('orders.deliveredConfirmedByDriver')}>
        <div className="flex items-start gap-1.5 whitespace-nowrap">
          <CheckCircleFilled className="mt-0.5 text-green-600" aria-hidden />
          <div className="leading-tight">
            <div className="tabular-nums text-slate-900">{deliveredAt.toLocaleString()}</div>
            {duration ? (
              <div className="text-xs text-slate-500">
                {t('orders.deliveryDuration', { duration })}
              </div>
            ) : null}
          </div>
        </div>
      </Tooltip>
    )
  }

  // A cart split across sellers: some parts may already be in the customer's hands.
  const parts = Array.isArray(order.parts) ? order.parts : []
  if (order.status !== 'cancelled' && parts.length > 1) {
    const progress = partsDeliveryProgress(parts)
    if (progress.delivered > 0) {
      return (
        <Tooltip
          title={parts
            .filter((p) => p.status === 'delivered' && parseInstant(p.deliveredAt))
            .map((p) => `${p.sellerName || '—'}: ${parseInstant(p.deliveredAt).toLocaleString()}`)
            .join(' · ')}
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-amber-600">
            <ClockCircleOutlined aria-hidden />
            {t('orders.partsDelivered', progress)}
          </span>
        </Tooltip>
      )
    }
  }

  if (order.status === 'out_for_delivery') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-cyan-700">
        <ClockCircleOutlined aria-hidden />
        {t('orders.awaitingDeliveryConfirm')}
      </span>
    )
  }

  return <span className="text-slate-400">{t('shared.emDash')}</span>
}
