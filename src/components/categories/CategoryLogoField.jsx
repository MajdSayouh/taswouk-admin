import { useEffect, useMemo } from 'react'
import { Button, Upload } from 'antd'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'

/**
 * @param {{
 *   existingLogoUrl?: string | null
 *   file: File | null
 *   onFileChange: (file: File | null) => void
 *   onRemoveExisting?: () => void
 *   removing?: boolean
 *   labels: {
 *     title: string
 *     hint: string
 *     upload: string
 *     remove: string
 *   }
 * }} props
 */
export function CategoryLogoField({
  existingLogoUrl,
  file,
  onFileChange,
  onRemoveExisting,
  removing = false,
  labels,
}) {
  const newPreview = useMemo(
    () => (file ? URL.createObjectURL(file) : ''),
    [file],
  )

  useEffect(() => {
    return () => {
      if (newPreview) URL.revokeObjectURL(newPreview)
    }
  }, [newPreview])

  const displaySrc = newPreview || (existingLogoUrl ? resolvePublicMediaUrl(existingLogoUrl) : '')

  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-slate-700 mb-2">{labels.title}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {displaySrc ? (
            <img src={displaySrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
        <div className="space-y-2">
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(next) => {
              onFileChange(next)
              return false
            }}
          >
            <Button size="small">{labels.upload}</Button>
          </Upload>
          {file ? (
            <Button size="small" type="link" onClick={() => onFileChange(null)}>
              {labels.remove}
            </Button>
          ) : null}
          {!file && existingLogoUrl && onRemoveExisting ? (
            <Button size="small" type="link" danger loading={removing} onClick={onRemoveExisting}>
              {labels.remove}
            </Button>
          ) : null}
          <p className="text-xs text-slate-500">{labels.hint}</p>
        </div>
      </div>
    </div>
  )
}
