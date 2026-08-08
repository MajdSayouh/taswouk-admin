import { useTranslation } from 'react-i18next'
import { Tag } from 'antd'

/** @param {{ className?: string }} [props] */
export function ExternalOrderTag({ className = '' }) {
  const { t } = useTranslation('pages')
  return (
    <Tag color="purple" bordered={false} className={`!m-0 !text-[10px] ${className}`.trim()}>
      {t('orders.externalBadge')}
    </Tag>
  )
}
