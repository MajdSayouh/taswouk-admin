// Table cell: long text shown as a short preview (2 lines); full text in tooltip.
import { Tooltip } from 'antd'

/**
 * @param {{ text: unknown; emptyLabel?: import('react').ReactNode; className?: string }} props
 */
export function TruncatedTextCell({ text, emptyLabel = '—', className = '' }) {
  const s = text != null && String(text).trim() !== '' ? String(text).trim() : ''
  if (!s) {
    return <span className={`text-slate-600 text-sm ${className}`}>{emptyLabel}</span>
  }
  return (
    <Tooltip title={s}>
      <span
        className={`text-slate-600 text-sm line-clamp-2 max-w-[280px] inline-block align-top ${className}`}
      >
        {s}
      </span>
    </Tooltip>
  )
}
