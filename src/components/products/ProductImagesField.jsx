// Images: choose files, preview thumbnails; optional existing URLs (edit mode).
import { useEffect, useMemo, useRef } from 'react'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Image, Popconfirm, Spin } from 'antd'
import { AuthenticatedProductImage } from './AuthenticatedProductImage.jsx'

/** @type {React.CSSProperties} */
const tileStyle = {
  width: 112,
  height: 112,
  borderRadius: 10,
  overflow: 'hidden',
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
}

/**
 * @param {{
 *   label?: string
 *   imageFiles: File[]
 *   onImageFilesChange: (files: File[]) => void
 *   existingImages?: { id?: number | string; storagePath?: string; url?: string }[]
 *   productId?: string | number
 *   disabled?: boolean
 *   onRemoveExistingImage?: (imageId: string | number) => void | Promise<void>
 *   onRemoveAllExistingImages?: () => void | Promise<void>
 *   removingImageIds?: (string | number)[]
 *   removeAllBusy?: boolean
 * }} props
 */
export function ProductImagesField({
  label = 'Images',
  imageFiles,
  onImageFilesChange,
  existingImages = [],
  productId,
  disabled = false,
  onRemoveExistingImage,
  onRemoveAllExistingImages,
  removingImageIds = [],
  removeAllBusy = false,
}) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const canRemoveSaved = Boolean(productId && onRemoveExistingImage && !disabled)
  const canRemoveAllSaved = canRemoveSaved && onRemoveAllExistingImages
  const remSet = useMemo(() => new Set(removingImageIds.map(String)), [removingImageIds])

  const previewPairs = useMemo(() => {
    return imageFiles.map((file, index) => ({
      file,
      index,
      key: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    }))
  }, [imageFiles])

  const previewUrls = useMemo(() => previewPairs.map(({ file }) => URL.createObjectURL(file)), [previewPairs])

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [previewUrls])

  function addFiles(fileList) {
    const next = [...imageFiles]
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      if (f && /^image\//i.test(f.type)) next.push(f)
    }
    onImageFilesChange(next)
  }

  function removeNewAt(index) {
    onImageFilesChange(imageFiles.filter((_, i) => i !== index))
  }

  const hasRemovableExisting = existingImages.some((img) => img.id != null)

  return (
    <div className="md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {canRemoveAllSaved && hasRemovableExisting ? (
          <Popconfirm
            title="Remove all saved images?"
            description="This cannot be undone."
            okText="Remove all"
            cancelText="Cancel"
            okButtonProps={{ loading: removeAllBusy, danger: true }}
            disabled={disabled || removeAllBusy}
            onConfirm={() => onRemoveAllExistingImages?.()}
          >
            <button
              type="button"
              disabled={disabled || removeAllBusy}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Remove all saved
            </button>
          </Popconfirm>
        ) : null}
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {productId
          ? 'Click an image to preview full size. Remove saved images anytime; new files upload when you save.'
          : 'Upload one or more images. They are sent to the server after the product is saved.'}
      </p>
      <div className="flex flex-wrap gap-3">
        {existingImages.map((img) => {
          const path = img.storagePath ?? img.url
          if (!path) return null
          const rid = img.id
          const busy = rid != null && remSet.has(String(rid))
          return (
            <div key={rid ?? path} style={tileStyle} className="relative shrink-0 group">
              <AuthenticatedProductImage
                productId={productId}
                storagePath={path}
                alt=""
                width={112}
                height={112}
                className="object-cover block max-w-none w-full h-full [&_.ant-image-img]:object-cover"
                preview
              />
              <span className="absolute bottom-1 left-1 right-1 rounded bg-black/55 text-[10px] text-white text-center py-0.5 pointer-events-none">
                Saved
              </span>
              {busy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Spin size="small" />
                </div>
              ) : null}
              {canRemoveSaved && rid != null ? (
                <Popconfirm
                  title="Remove this image?"
                  okText="Remove"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true, loading: busy }}
                  disabled={busy || removeAllBusy}
                  onConfirm={() => onRemoveExistingImage?.(rid)}
                >
                  <button
                    type="button"
                    className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-red-600 transition-colors opacity-90 group-hover:opacity-100"
                    aria-label="Remove saved image"
                    disabled={busy || removeAllBusy}
                  >
                    <DeleteOutlined className="text-[13px]" />
                  </button>
                </Popconfirm>
              ) : null}
            </div>
          )
        })}
        {previewPairs.map(({ index, key }, i) => (
          <div key={key} style={tileStyle} className="relative shrink-0">
            <Image
              src={previewUrls[i]}
              alt=""
              width={112}
              height={112}
              className="object-cover block w-full h-full [&_.ant-image-img]:object-cover"
              preview
            />
            {!disabled ? (
              <button
                type="button"
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                aria-label="Remove image"
                onClick={() => removeNewAt(index)}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {!disabled ? (
          <button
            type="button"
            style={tileStyle}
            className="flex shrink-0 flex-col items-center justify-center gap-1 text-slate-500 hover:border-[#FF7D29] hover:text-[#FF7D29] transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <PlusOutlined />
            <span className="text-[11px] font-medium">Add</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const list = e.target.files
          if (list?.length) addFiles(list)
          e.target.value = ''
        }}
      />
    </div>
  )
}
