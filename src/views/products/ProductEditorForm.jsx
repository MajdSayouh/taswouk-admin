// Shared create/edit product fields aligned with ProductCreateSchema / ProductUpdateSchema.
import { useState } from 'react'
import { Select, Switch, Tag } from 'antd'
import { Input } from '../../components/ui/Input'
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
 * @property {string | number} rate — 1–5
 * @property {boolean} isActive
 * @property {File[]} [imageFiles]
 */

/**
 * @param {{
 *   stores: unknown[]
 *   storesLoading: boolean
 *   storeSelectLocked?: boolean
 *   form: ProductEditorFormValues
 *   setForm: (updater: (prev: object) => object) => void
 *   categories?: { id: string, name: string }[]
 *   subcategories?: { id: string, name: string, categoryId?: string }[]
 *   categoriesLoading?: boolean
 *   categoriesError?: string | null
 *   children: React.ReactNode
 *   existingImages?: { id?: number | string; storagePath?: string; url?: string }[]
 *   productId?: string | number
 *   onRemoveExistingImage?: (imageId: string | number) => void | Promise<void>
 *   onRemoveAllExistingImages?: () => void | Promise<void>
 *   removingImageIds?: (string | number)[]
 *   removeAllBusy?: boolean
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
}) {
  const [colorDraft, setColorDraft] = useState('#FF7D29')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const storeOptions = (Array.isArray(stores) ? stores : []).map((s) => ({
    value: String(s.id),
    label: s.name ? `${s.name} (#${s.id})` : `Store #${s.id}`,
  }))
  const categoryOptions = (Array.isArray(categories) ? categories : []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))
  const subcategoryOptions = (Array.isArray(subcategories) ? subcategories : [])
    .filter((sc) => !form.categoryId || String(sc.categoryId) === String(form.categoryId))
    .map((sc) => ({
      value: String(sc.id),
      label: sc.name,
    }))

  const imageFiles = Array.isArray(form.imageFiles) ? form.imageFiles : []

  function addColor() {
    const hex = colorDraft.toUpperCase()
    setForm((prev) => {
      const colors = Array.isArray(prev.colors) ? [...prev.colors] : []
      if (colors.includes(hex)) return prev
      return { ...prev, colors: [...colors, hex] }
    })
  }

  function removeColor(hex) {
    setForm((prev) => ({
      ...prev,
      colors: (Array.isArray(prev.colors) ? prev.colors : []).filter((c) => c !== hex),
    }))
  }

  const colors = Array.isArray(form.colors) ? form.colors : []

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Store</label>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder={storesLoading ? 'Loading stores…' : 'Select store'}
          loading={storesLoading}
          disabled={storesLoading || storeSelectLocked || storeOptions.length === 0}
          className="w-full"
          size="large"
          value={form.storeId || undefined}
          onChange={(value) => setForm((prev) => ({ ...prev, storeId: value }))}
          options={storeOptions}
        />
        {storeSelectLocked ? (
          <p className="text-xs text-slate-500 mt-1">Store cannot be changed when editing.</p>
        ) : !storesLoading && storeOptions.length === 0 ? (
          <p className="text-xs text-slate-500 mt-1">
            No stores returned. Create a store first.
          </p>
        ) : null}
      </div>
      <Input
        label="Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Product name"
        required
        className="md:col-span-2"
      />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          className="w-full"
          size="large"
          loading={categoriesLoading}
          placeholder={categoriesLoading ? 'Loading categories…' : 'Select category'}
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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Sub-category</label>
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          className="w-full"
          size="large"
          loading={categoriesLoading}
          placeholder={!form.categoryId ? 'Select category first' : 'Select sub-category'}
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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Sizes</label>
        <Select
          mode="multiple"
          allowClear
          placeholder="Select sizes"
          className="w-full max-w-xl"
          size="large"
          options={PRODUCT_SIZE_OPTIONS}
          value={Array.isArray(form.sizes) ? form.sizes : []}
          onChange={(values) =>
            setForm((prev) => ({
              ...prev,
              sizes: Array.isArray(values) ? values : [],
            }))
          }
        />
        <p className="text-xs text-slate-500 mt-1">Choose all sizes that apply to this product.</p>
      </div>
      <div className="md:col-span-2 space-y-2">
        <span className="block text-sm font-medium text-slate-700">Colors</span>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {colors.length === 0 ? (
            <span className="text-sm text-slate-400">No colors added yet.</span>
          ) : (
            colors.map((hex) => (
              <Tag
                key={hex}
                closable
                onClose={() => removeColor(hex)}
                className="!m-0 !flex !items-center gap-1.5 !rounded-md !border !border-slate-200 !px-2 !py-1 !text-xs"
              >
                <span
                  className="inline-block h-4 w-4 shrink-0 rounded-sm border border-slate-300"
                  style={{ backgroundColor: hex }}
                  aria-hidden
                />
                {hex}
              </Tag>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={colorDraft}
            onChange={(e) => setColorDraft(e.target.value)}
            className="h-9 w-12 cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
            title="Pick a color"
            aria-label="Pick a color"
          />
          <button
            type="button"
            onClick={addColor}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:border-[#FF7D29] hover:text-[#FF7D29] transition-colors"
          >
            Add color
          </button>
        </div>
      </div>
      <Input
        label="Description"
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Optional"
        className="md:col-span-2"
      />
      <Input
        label="Price (SAR)"
        name="price"
        type="number"
        step="0.01"
        min="0"
        value={form.price}
        onChange={handleChange}
        required
      />
      <Input
        label="Rating (1–5)"
        name="rate"
        type="number"
        step="1"
        min="1"
        max="5"
        value={form.rate}
        onChange={handleChange}
      />

      <div className="md:col-span-2 flex flex-wrap items-center gap-x-8 gap-y-3">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <span className="text-sm font-medium text-slate-800 whitespace-nowrap">On offer</span>
          <Switch
            checked={form.isOffer}
            onChange={(checked) => setForm((prev) => ({ ...prev, isOffer: checked }))}
          />
        </label>
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <span className="text-sm font-medium text-slate-800 whitespace-nowrap">Active</span>
          <Switch
            checked={form.isActive}
            onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
          />
        </label>
      </div>

      {form.isOffer ? (
        <Input
          label="Offer price (SAR)"
          name="newPrice"
          type="number"
          step="0.01"
          min="0"
          value={form.newPrice}
          onChange={handleChange}
          className="md:col-span-2"
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
      />

      <div className="md:col-span-2 flex justify-end gap-3 pt-2">{children}</div>
    </div>
  )
}
