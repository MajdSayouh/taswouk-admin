// Toolbar: search + optional filter controls (left-aligned).
import { useTranslation } from 'react-i18next'
import { Input, Space } from 'antd'

/**
 * @param {{
 *   searchPlaceholder?: string
 *   searchValue: string
 *   onSearchChange: (value: string) => void
 *   filterSlot?: React.ReactNode
 * }} props
 */
export function DashboardTableToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filterSlot,
}) {
  const { t } = useTranslation('pages')
  const placeholder = searchPlaceholder ?? t('shared.searchEllipsis')
  return (
    <div className="flex flex-col gap-3 items-start mb-4">
      <Input.Search
        allowClear
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full max-w-sm"
        size="middle"
      />
      {filterSlot ? (
        <Space wrap size="middle" className="justify-start">
          {filterSlot}
        </Space>
      ) : null}
    </div>
  )
}
