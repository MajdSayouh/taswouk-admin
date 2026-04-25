// Ant Design Table filterDropdown: text filter + apply / reset.
import { useEffect, useState } from 'react'
import { Button, Input, Space } from 'antd'

/**
 * @param {{
 *   placeholder?: string
 *   value: string
 *   onApply: (value: string) => void
 *   onReset: () => void
 *   confirm: () => void
 * }} props
 */
export function ColumnTextFilterDropdown({ placeholder, value, onApply, onReset, confirm }) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  return (
    <div className="p-2 w-52" onKeyDown={(e) => e.stopPropagation()}>
      <Input
        size="small"
        allowClear
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onPressEnter={() => {
          onApply(local.trim())
          confirm()
        }}
      />
      <Space className="mt-2 w-full justify-end">
        <Button
          size="small"
          type="primary"
          onClick={() => {
            onApply(local.trim())
            confirm()
          }}
        >
          Filter
        </Button>
        <Button
          size="small"
          onClick={() => {
            setLocal('')
            onReset()
            confirm()
          }}
        >
          Reset
        </Button>
      </Space>
    </div>
  )
}
