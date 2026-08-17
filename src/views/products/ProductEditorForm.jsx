// Shared create/edit product fields aligned with ProductCreateSchema / ProductUpdateSchema.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, Spin, Switch, Tag } from 'antd'
import { DeleteOutlined, PlayCircleOutlined, UploadOutlined } from '@ant-design/icons'
import { Input } from '../../components/ui/Input'
import { RichTextEditor } from '../../components/ui/RichTextEditor.jsx'
import { ProductImagesField } from '../../components/products/ProductImagesField.jsx'

/** Clothing + common numeric sizes (shoes). */
export const PRODUCT_SIZE_OPTIONS = [
  { label: 'XS', value: 'XS' },
  { label: 'S', value: 'S' },
  { label: 'M', value: 'M' },
  { label: 'L', value: 'L' },
  { label: 'XL', value: 'XL' },
  { label: 'XXL', value: 'XXL' },
  { label: '3XL', value: '3XL' },
  ...['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'].map((n) => ({
    label: n,
    value: n,
  })),
]

/**
 * The variant API rejects a hex code as a `color` attribute value — it wants a customer-readable
 * name (see `buildVariantAttributes` in productVariants.js). "Add Color" still works as a single
 * swatch-pick-and-add action (no typing), by resolving the picked shade to its nearest name here.
 */
const COLOR_NAME_PALETTE = [
  { hex: '#000000', ar: 'أسود', en: 'Black' },
  { hex: '#FFFFFF', ar: 'أبيض', en: 'White' },
  { hex: '#808080', ar: 'رمادي', en: 'Gray' },
  { hex: '#C0C0C0', ar: 'فضي', en: 'Silver' },
  { hex: '#FF0000', ar: 'أحمر', en: 'Red' },
  { hex: '#800000', ar: 'عنابي', en: 'Maroon' },
  { hex: '#FFA500', ar: 'برتقالي', en: 'Orange' },
  { hex: '#FFFF00', ar: 'أصفر', en: 'Yellow' },
  { hex: '#FFD700', ar: 'ذهبي', en: 'Gold' },
  { hex: '#808000', ar: 'زيتي', en: 'Olive' },
  { hex: '#00FF00', ar: 'أخضر', en: 'Green' },
  { hex: '#008080', ar: 'تركواز', en: 'Teal' },
  { hex: '#40E0D0', ar: 'فيروزي', en: 'Turquoise' },
  { hex: '#00FFFF', ar: 'سماوي', en: 'Cyan' },
  { hex: '#0000FF', ar: 'أزرق', en: 'Blue' },
  { hex: '#000080', ar: 'كحلي', en: 'Navy' },
  { hex: '#800080', ar: 'بنفسجي', en: 'Purple' },
  { hex: '#FF00FF', ar: 'أرجواني', en: 'Magenta' },
  { hex: '#FFC0CB', ar: 'وردي', en: 'Pink' },
  { hex: '#A52A2A', ar: 'بني', en: 'Brown' },
  { hex: '#F5F5DC', ar: 'بيج', en: 'Beige' },
]

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex ?? '').trim())
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

/** Nearest palette entry to `hex` by plain RGB distance — good enough for a picker shortcut. */
function nearestColorName(hex, lang = 'ar') {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  let best = null
  let bestDist = Infinity
  for (const c of COLOR_NAME_PALETTE) {
    const crgb = hexToRgb(c.hex)
    const dist = (rgb.r - crgb.r) ** 2 + (rgb.g - crgb.g) ** 2 + (rgb.b - crgb.b) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best ? (lang === 'en' ? best.en : best.ar) : null
}

/**
 * @typedef {Object} ProductEditorFormValues
 * @property {string} storeId
 * @property {string} name
 * @property {string} [categoryId]
 * @property {string} category
 * @property {string} [subCategoryId]
 * @property {string} subCategory
 * @property {string[]} sizes — selected size values
 * @property {string[]} colors — hex strings e.g. #RRGGBB
 * @property {string} description
 * @property {string} price
 * @property {boolean} isOffer
 * @property {string} newPrice
 * @property {boolean} isActive
 * @property {File[]} [imageFiles]
 * @property {File | null} [videoFile]
 */

/**
 * @param {{
 *   stores: unknown[]
 *   storesLoading: boolean
 *   storeSelectLocked?: boolean
 *   form: ProductEditorFormValues
 *   setForm: (updater: (prev: object) => object) => void
 *   categories?: { id: string, name: string, isActive?: boolean }[]
 *   subcategories?: { id: string, name: string, categoryId?: string, isActive?: boolean }[]
 *   categoriesLoading?: boolean
 *   categoriesError?: string | null
 *   children: React.ReactNode
 *   existingImages?: { id?: number | string; storagePath?: string; url?: string; isFeatured?: boolean }[]
 *   productId?: string | number
 *   onRemoveExistingImage?: (imageId: string | number) => void | Promise<void>
 *   onRemoveAllExistingImages?: () => void | Promise<void>
 *   removingImageIds?: (string | number)[]
 *   removeAllBusy?: boolean
 *   onSetFeaturedImage?: (imageId: string | number) => void | Promise<void>
 *   settingFeaturedId?: string | number | null
 *   variantsSlot?: import('react').ReactNode
 *   variantsAnchorRef?: import('react').RefObject<HTMLElement | null>
 *   variantPricingManaged?: boolean
 *   onPriceChange?: (value: string) => void
 *   videoUploading?: boolean
 *   descriptionResetKey?: string | number
 * }} props
 */
export function ProductEditorForm({
  stores,
  storesLoading,
  storeSelectLocked = false,
  form,
  setForm,
  categories = [],
  subcategories = [],
  categoriesLoading = false,
  categoriesError = null,
  children,
  existingImages,
  productId,
  onRemoveExistingImage,
  onRemoveAllExistingImages,
  removingImageIds,
  removeAllBusy,
  onSetFeaturedImage,
  settingFeaturedId,
  variantsSlot,
  variantsAnchorRef,
  variantPricingManaged = false,
  onPriceChange,
  videoUploading = false,
  descriptionResetKey,
}) {
  const { t, i18n } = useTranslation('pages')
  const colorLang = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'ar'
  // Swatch picker — its picked shade is resolved to the nearest name in COLOR_NAME_PALETTE on Add,
  // since the backend rejects a hex code as a `color` attribute value (it wants a customer-readable
  // name, e.g. "أصفر"/"Yellow"). Single pick-and-add action, no typing required.
  const [colorHexDraft, setColorHexDraft] = useState('#000000')
  const colorNamePreview = nearestColorName(colorHexDraft, colorLang)
  // Session-only: remembers the exact shade picked for each added name, purely so its tag renders
  // with that color instead of the palette's canonical shade. The backend only stores the name
  // (see e.g. `colors: ["اصفر","تركواز","زيتي"]` on real products) — this hint isn't persisted and
  // isn't sent anywhere, so it resets on reload.
  const [colorSwatchHints, setColorSwatchHints] = useState({})

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handlePriceChange(event) {
    const value = event.target.value
    setForm((prev) => ({ ...prev, price: value }))
    onPriceChange?.(value)
  }

  const storeOptions = (Array.isArray(stores) ? stores : []).map((s) => ({
    value: String(s.id),
    label:
      s.name != null && String(s.name).trim()
        ? t('shared.storeNamed', { name: s.name, id: s.id })
        : t('shared.storeNumber', { id: s.id }),
  }))
  const categoryOptions = (Array.isArray(categories) ? categories : []).map((c) => ({
    value: String(c.id),
    label:
      c.isActive === false
        ? `${c.name} (${t('shared.inactive')})`
        : c.name,
  }))
  const subcategoryOptions = (Array.isArray(subcategories) ? subcategories : [])
    .filter((sc) => !form.categoryId || String(sc.categoryId) === String(form.categoryId))
    .map((sc) => ({
      value: String(sc.id),
      label:
        sc.isActive === false
          ? `${sc.name} (${t('shared.inactive')})`
          : sc.name,
    }))

  const imageFiles = Array.isArray(form.imageFiles) ? form.imageFiles : []

  function addColor() {
    const name = nearestColorName(colorHexDraft, colorLang)
    if (!name) return
    setForm((prev) => {
      const colors = Array.isArray(prev.colors) ? [...prev.colors] : []
      if (colors.some((c) => String(c).trim().toLowerCase() === name.toLowerCase())) return prev
      return { ...prev, colors: [...colors, name] }
    })
    setColorSwatchHints((prev) => ({ ...prev, [name]: colorHexDraft }))
  }

  function removeColor(name) {
    setForm((prev) => ({
      ...prev,
      colors: (Array.isArray(prev.colors) ? prev.colors : []).filter((c) => c !== name),
    }))
  }

  const colors = Array.isArray(form.colors) ? form.colors : []

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {t('products.editor.store')}
        </label>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder={
            storesLoading ? t('products.editor.loadingStores') : t('products.editor.selectStore')
          }
          loading={storesLoading}
          disabled={storesLoading || storeSelectLocked || storeOptions.length === 0}
          className="w-full"
          size="large"
          value={form.storeId || undefined}
          onChange={(value) => setForm((prev) => ({ ...prev, storeId: value }))}
          options={storeOptions}
        />
        {storeSelectLocked ? (
          <p className="text-xs text-slate-500 mt-1">{t('products.editor.storeLocked')}</p>
        ) : !storesLoading && storeOptions.length === 0 ? (
          <p className="text-xs text-slate-500 mt-1">{t('products.editor.noStores')}</p>
        ) : null}
      </div>
      <Input
        label={t('products.editor.productName')}
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder={t('products.editor.productNamePh')}
        required
        className="md:col-span-2"
      />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {t('products.editor.category')}
        </label>
        <Select
          showSearch
          optionFilterProp="label"
          className="w-full"
          size="large"
          loading={categoriesLoading}
          placeholder={
            categoriesLoading
              ? t('products.editor.loadingCategories')
              : t('products.editor.selectCategory')
          }
          value={form.categoryId || undefined}
          options={categoryOptions}
          onChange={(value, option) => {
            const picked = Array.isArray(option) ? option[0] : option
            const label = picked?.label ? String(picked.label) : ''
            setForm((prev) => ({
              ...prev,
              categoryId: value ? String(value) : '',
              category: label || '',
              subCategoryId: '',
              subCategory: '',
            }))
          }}
        />
        {categoriesError ? <p className="text-xs text-amber-600 mt-1">{categoriesError}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {t('products.editor.subcategory')}
        </label>
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          className="w-full"
          size="large"
          loading={categoriesLoading}
          placeholder={
            !form.categoryId
              ? t('products.editor.selectCategoryFirst')
              : t('products.editor.selectSubcategory')
          }
          value={form.subCategoryId || undefined}
          options={subcategoryOptions}
          disabled={!form.categoryId}
          onChange={(value, option) => {
            const picked = Array.isArray(option) ? option[0] : option
            const label = picked?.label ? String(picked.label) : ''
            setForm((prev) => ({
              ...prev,
              subCategoryId: value ? String(value) : '',
              subCategory: label || '',
            }))
          }}
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {t('products.editor.sizes')}
        </label>
        <input
          key={descriptionResetKey ?? 'static'}
          type="text"
          className="h-9 w-full max-w-xl rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D29] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          placeholder={t('products.editor.selectSizes')}
          defaultValue={Array.isArray(form.sizes) ? form.sizes.join(', ') : ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              sizes: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
        />
        <p className="text-xs text-slate-500 mt-1">{t('products.editor.sizesHint')}</p>
      </div>
      <div className="md:col-span-2 space-y-2">
        <span className="block text-sm font-medium text-slate-700">{t('products.editor.colors')}</span>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {colors.length === 0 ? (
            <span className="text-sm text-slate-400">{t('products.editor.noColors')}</span>
          ) : (
            colors.map((name) => {
              // A picked swatch (this session only) or, for legacy hex-named entries, the name
              // itself when it happens to already be a hex code — otherwise a neutral placeholder.
              const swatch = colorSwatchHints[name] || (/^#/i.test(name) ? name : null)
              return (
                <Tag
                  key={name}
                  closable
                  onClose={() => removeColor(name)}
                  className="!m-0 !flex !items-center gap-1.5 !rounded-md !border !border-slate-200 !px-2 !py-1 !text-xs"
                >
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded-sm border border-slate-300"
                    style={{ backgroundColor: swatch || '#e2e8f0' }}
                    aria-hidden
                  />
                  {name}
                </Tag>
              )
            })
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={colorHexDraft}
            onChange={(e) => setColorHexDraft(e.target.value)}
            className="h-9 w-12 cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
            title={t('products.editor.pickColor')}
            aria-label={t('products.editor.pickColor')}
          />
          <button
            type="button"
            onClick={addColor}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:border-[#FF7D29] hover:text-[#FF7D29] transition-colors"
          >
            {t('products.editor.addColor')}
          </button>
          {colorNamePreview ? (
            <span className="text-xs text-slate-500">
              {t('products.editor.colorAutoName', { name: colorNamePreview })}
            </span>
          ) : null}
        </div>
      </div>

      {variantsSlot ? (
        <div
          id="variants"
          ref={variantsAnchorRef}
          className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/90 p-4 scroll-mt-24"
        >
          {variantsSlot}
        </div>
      ) : null}

      <RichTextEditor
        label={t('products.editor.description')}
        value={form.description}
        onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
        placeholder={t('shared.placeholder')}
        className="md:col-span-2"
        resetKey={descriptionResetKey}
      />
      <Input
        label={t('products.editor.price')}
        name="price"
        type="number"
        step="0.01"
        min="0"
        value={form.price}
        onChange={handlePriceChange}
        description={
          variantPricingManaged ? t('products.editor.variantBulkPriceHint') : undefined
        }
      />
      <div className="md:col-span-2 flex flex-wrap items-center gap-x-8 gap-y-3">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
            {t('products.editor.onOffer')}
          </span>
          <Switch
            checked={form.isOffer}
            disabled={variantPricingManaged}
            onChange={(checked) => setForm((prev) => ({ ...prev, isOffer: checked }))}
          />
        </label>
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
            {t('products.editor.active')}
          </span>
          <Switch
            checked={form.isActive}
            onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
          />
        </label>
      </div>

      {form.isOffer ? (
        <Input
          label={t('products.editor.offerPrice')}
          name="newPrice"
          type="number"
          step="0.01"
          min="0"
          value={form.newPrice}
          onChange={handleChange}
          className="md:col-span-2"
          disabled={variantPricingManaged}
        />
      ) : null}

      <ProductImagesField
        imageFiles={imageFiles}
        onImageFilesChange={(files) => setForm((prev) => ({ ...prev, imageFiles: files }))}
        existingImages={existingImages}
        productId={productId}
        onRemoveExistingImage={onRemoveExistingImage}
        onRemoveAllExistingImages={onRemoveAllExistingImages}
        removingImageIds={removingImageIds}
        removeAllBusy={removeAllBusy}
        onSetFeaturedImage={onSetFeaturedImage}
        settingFeaturedId={settingFeaturedId}
      />

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {t('products.editor.videoFile')}
        </label>
        <div className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          {videoUploading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/75">
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm">
                <Spin size="small" />
                <span>{t('products.editor.videoUploading')}</span>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                {form.videoFile ? <PlayCircleOutlined /> : <UploadOutlined />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {form.videoFile
                    ? t('products.editor.selectedVideo', { name: form.videoFile.name })
                    : t('products.editor.videoFileHint')}
                </p>
                {form.videoFile ? (
                  <p className="text-xs text-slate-500">
                    {t('products.editor.videoSize', {
                      size: (form.videoFile.size / 1024 / 1024).toFixed(1),
                    })}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-[#FF7D29] hover:text-[#FF7D29]">
                <UploadOutlined className="mr-2" />
                {form.videoFile ? t('products.editor.changeVideo') : t('products.editor.chooseVideo')}
                <input
                  type="file"
                  accept="video/mp4,video/avi,video/mov,video/mkv,video/webm,video/wmv,video/flv,video/m4v"
                  disabled={videoUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    setForm((prev) => ({
                      ...prev,
                      videoFile: file && /^video\//i.test(file.type) ? file : null,
                    }))
                    event.target.value = ''
                  }}
                  className="hidden"
                />
              </label>
              {form.videoFile ? (
                <button
                  type="button"
                  disabled={videoUploading}
                  onClick={() => setForm((prev) => ({ ...prev, videoFile: null }))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-100 bg-white text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  aria-label={t('products.editor.removeVideo')}
                >
                  <DeleteOutlined />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 flex justify-end gap-3 pt-2">{children}</div>
    </div>
  )
}
