// Reusable column filter: yes / no multi-select (same UX as Stores active/brand filters).
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, Space, Button as AntButton } from 'antd'

/**
 * @param {{
 *   value: string[] | null | undefined
 *   onApply: (v: string[] | null) => void
 *   confirm: () => void
 *   placeholder?: string
 * }} props
 */
export function TriStateYesNoColumnFilter({ value, onApply, confirm, placeholder }) {
  const { t } = useTranslation('pages')
  const [local, setLocal] = useState(value || [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync filter dropdown with controlled value
    setLocal(value || [])
  }, [value])
  const ph = placeholder ?? t('shared.textFilter')
  return (
    <div className="p-2 w-52" onKeyDown={(e) => e.stopPropagation()}>
      <Select
        mode="multiple"
        allowClear
        placeholder={ph}
        className="w-full mb-2"
        value={local}
        onChange={setLocal}
        options={[
          { value: 'yes', label: t('shared.yes') },
          { value: 'no', label: t('shared.no') },
        ]}
      />
      <Space className="w-full justify-end">
        <AntButton
          size="small"
          type="primary"
          onClick={() => {
            onApply(local.length ? local : null)
            confirm()
          }}
        >
          {t('shared.apply')}
        </AntButton>
        <AntButton
          size="small"
          onClick={() => {
            setLocal([])
            onApply(null)
            confirm()
          }}
        >
          {t('shared.reset')}
        </AntButton>
      </Space>
    </div>
  )
}
