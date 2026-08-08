import { isProbablyUrl, formatExternalProductDisplay } from '../../utils/externalOrder.js'

/**
 * @param {{ name: string; isExternal?: boolean }} props
 */
export function ExternalOrderProductCell({ name, isExternal = false }) {
  const value = String(name ?? '').trim()
  if (!value) return <span className="text-slate-400">—</span>

  if (isExternal && isProbablyUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-[#FF7D29] hover:underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {formatExternalProductDisplay(value)}
      </a>
    )
  }

  return <span className="text-slate-700 break-words">{formatExternalProductDisplay(value)}</span>
}
