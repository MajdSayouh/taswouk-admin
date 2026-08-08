// Images: choose files, preview thumbnails; optional existing URLs (edit mode).
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
 *   existingImages?: { id?: number | string; storagePath?: string; url?: string; isFeatured?: boolean }[]
 *   productId?: string | number
 *   disabled?: boolean
 *   onRemoveExistingImage?: (imageId: string | number) => void | Promise<void>
 *   onRemoveAllExistingImages?: () => void | Promise<void>
 *   removingImageIds?: (string | number)[]
 *   removeAllBusy?: boolean
 *   onSetFeaturedImage?: (imageId: string | number) => void | Promise<void>
 *   settingFeaturedId?: string | number | null
 * }} props
 */
export function ProductImagesField({
  label,
  imageFiles,
  onImageFilesChange,
  existingImages = [],
  productId,
  disabled = false,
  onRemoveExistingImage,
  onRemoveAllExistingImages,
  removingImageIds = [],
  removeAllBusy = false,
  onSetFeaturedImage,
  settingFeaturedId = null,
}) {
  const { t } = useTranslation('pages')
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const canRemoveSaved = Boolean(productId && onRemoveExistingImage && !disabled)
  const canRemoveAllSaved = canRemoveSaved && onRemoveAllExistingImages
  const remSet = useMemo(() => new Set(removingImageIds.map(String)), [removingImageIds])
  const canSetFeatured = Boolean(productId && onSetFeaturedImage && !disabled)
  const settingIdStr = settingFeaturedId != null ? String(settingFeaturedId) : ''

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
        <span className="block text-sm font-medium text-slate-700">
          {label ?? t('products.images.label')}
        </span>
        {canRemoveAllSaved && hasRemovableExisting ? (
          <Popconfirm
            title={t('products.images.removeAllTitle')}
            description={t('products.images.removeAllDesc')}
            okText={t('products.images.removeAllOk')}
            cancelText={t('shared.cancel')}
            okButtonProps={{ loading: removeAllBusy, danger: true }}
            disabled={disabled || removeAllBusy}
            onConfirm={() => onRemoveAllExistingImages?.()}
          >
            <button
              type="button"
              disabled={disabled || removeAllBusy}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {t('products.images.removeAll')}
            </button>
          </Popconfirm>
        ) : null}
      </div>
      <p className="text-xs text-slate-500 mb-3">
        {productId ? t('products.images.hintEdit') : t('products.images.hintCreate')}
      </p>
      <div className="flex flex-wrap gap-3">
        {existingImages.map((img) => {
          const path = img.storagePath ?? img.url
          if (!path) return null
          const rid = img.id
          const busy = rid != null && remSet.has(String(rid))
          const isFeatured = Boolean(img.isFeatured)
          const featuredBusy = canSetFeatured && rid != null && settingIdStr === String(rid)
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
              {isFeatured ? (
                <span className="absolute top-1 right-8 rounded bg-amber-600/95 text-[10px] font-semibold text-white px-1.5 py-0.5 pointer-events-none shadow-sm">
                  {t('products.images.coverRadio')}
                </span>
              ) : null}
              {canSetFeatured && rid != null ? (
                <label
                  className="absolute top-1 left-1 z-[2] flex cursor-pointer items-center gap-1 rounded bg-white/90 px-1 py-0.5 shadow-sm border border-slate-200/90"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="radio"
                    name={productId != null ? `product-cover-${productId}` : 'product-cover'}
                    checked={isFeatured}
                    disabled={
                      busy ||
                      removeAllBusy ||
                      featuredBusy ||
                      (settingFeaturedId != null && settingIdStr !== String(rid))
                    }
                    onChange={() => {
                      if (!isFeatured) onSetFeaturedImage?.(rid)
                    }}
                    className="h-3.5 w-3.5 accent-amber-600 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={t('products.images.coverAria')}
                  />
                  <span className="text-[9px] font-medium text-slate-700 select-none">
                    {t('products.images.coverRadio')}
                  </span>
                </label>
              ) : null}
              <span className="absolute bottom-1 left-1 right-1 rounded bg-black/55 text-[10px] text-white text-center py-0.5 pointer-events-none">
                {t('products.images.saved')}
              </span>
              {busy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Spin size="small" />
                </div>
              ) : null}
              {canRemoveSaved && rid != null ? (
                <Popconfirm
                  title={t('products.images.removeOneTitle')}
                  okText={t('products.images.removeOneOk')}
                  cancelText={t('shared.cancel')}
                  okButtonProps={{ danger: true, loading: busy }}
                  disabled={busy || removeAllBusy}
                  onConfirm={() => onRemoveExistingImage?.(rid)}
                >
                  <button
                    type="button"
                    className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white hover:bg-red-600 transition-colors opacity-90 group-hover:opacity-100"
                    aria-label={t('products.images.removeSavedAria')}
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
                aria-label={t('products.images.removeNewAria')}
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
            <span className="text-[11px] font-medium">{t('products.images.add')}</span>
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
