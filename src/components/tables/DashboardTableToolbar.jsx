// Toolbar: search + optional filter controls (left-aligned).
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
  searchPlaceholder = 'Search…',
  searchValue,
  onSearchChange,
  filterSlot,
}) {
  return (
    <div className="flex flex-col gap-3 items-start mb-4">
      <Input.Search
        allowClear
        placeholder={searchPlaceholder}
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
