// Compact fulfillment timeline: Steps + Progress (expandable row in orders table).
import { Progress, Steps } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  FULFILLMENT_PIPELINE,
  fulfillmentStepItemStatus,
  getFulfillmentProgressPercent,
  isCancelledOrderStatus,
} from '../../utils/orderFulfillment.js'

/** @param {{ status?: string }} props */
export function OrderFulfillmentStepper({ status }) {
  const { t } = useTranslation('pages')
  const s = String(status || '').toLowerCase()
  const cancelled = isCancelledOrderStatus(s)
  const percent = getFulfillmentProgressPercent(s)

  const items = FULFILLMENT_PIPELINE.map((key, index) => ({
    title: <span className="text-xs sm:text-sm whitespace-nowrap">{t(`orders.status.${key}`)}</span>,
    status: fulfillmentStepItemStatus(s, index),
  }))

  if (cancelled) {
    return (
      <div className="rounded-lg bg-slate-50/90 border border-slate-100 px-3 py-3 space-y-2">
        <Progress percent={0} status="exception" size="small" />
        <p className="text-xs text-red-600">{t('orders.progressCancelled')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-slate-50/90 border border-slate-100 px-2 sm:px-3 py-3 space-y-3">
      <div className="overflow-x-auto -mx-1 px-1">
        <Steps size="small" items={items} className="min-w-[520px] sm:min-w-0" />
      </div>
      <Progress
        percent={percent}
        size="small"
        strokeColor="#FF7D29"
        trailColor="#e2e8f0"
        format={(p) => `${p}%`}
      />
    </div>
  )
}
