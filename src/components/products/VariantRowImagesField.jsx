// Per-variant image thumbnails + file picker (paths saved on variant per Taswouk VariantCreate/Update `images`).
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthenticatedProductImage } from './AuthenticatedProductImage.jsx'

function FilePreview({ file, onRemove, removeLabel }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded bg-black/55 text-[11px] font-bold text-white hover:bg-black/75"
        aria-label={removeLabel}
      >
        ×
      </button>
    </div>
  )
}

/**
 * @param {{
 *   rowKey: string
 *   productId?: string | number | null
 *   existingImages: { id: string | number, path: string }[]
 *   imageFiles: File[]
 *   removingImageId?: string | number | null
 *   onRemoveExisting: (image: { id: string | number, path: string }) => void
 *   onAddFiles: (files: FileList | null) => void
 *   onRemoveNewFile: (index: number) => void
 * }} props
 */
export function VariantRowImagesField({
  rowKey,
  productId,
  existingImages,
  imageFiles,
  removingImageId = null,
  onRemoveExisting,
  onAddFiles,
  onRemoveNewFile,
}) {
  const { t } = useTranslation('pages')
  const images = Array.isArray(existingImages) ? existingImages : []
  const files = Array.isArray(imageFiles) ? imageFiles : []
  const inputId = `variant-img-${rowKey}`

  return (
    <div className="w-full mt-3 pt-3 border-t border-slate-100">
      <span className="block text-xs font-medium text-slate-600 mb-2">
        {t('products.variants.variantImages')}
      </span>
      <p className="text-[11px] text-slate-500 mb-2">{t('products.variants.variantImagesHint')}</p>
      <div className="flex flex-wrap items-start gap-2">
        {images.map((image, idx) => (
          <div
            key={`${image.id ?? image.path}-${idx}`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
          >
            {productId ? (
              <AuthenticatedProductImage
                productId={productId}
                storagePath={image.path}
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover block max-w-none"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400 px-1 text-center leading-tight">
                {image.path.split('/').pop()?.slice(0, 12) ?? image.path}
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemoveExisting(image)}
              disabled={removingImageId != null && String(removingImageId) === String(image.id)}
              className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded bg-black/55 text-[11px] font-bold text-white hover:bg-black/75 disabled:opacity-50"
              aria-label={t('products.variants.removeVariantImageAria')}
            >
              ×
            </button>
          </div>
        ))}
        {files.map((file, idx) => (
          <FilePreview
            key={`${file.name}-${idx}-${file.size}`}
            file={file}
            onRemove={() => onRemoveNewFile(idx)}
            removeLabel={t('products.variants.removeVariantImageAria')}
          />
        ))}
      </div>
      <div className="mt-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            onAddFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-[#FF7D29] hover:text-[#FF7D29]"
        >
          {t('products.variants.addVariantImages')}
        </label>
      </div>
    </div>
  )
}
