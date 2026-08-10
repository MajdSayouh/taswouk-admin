import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, Switch } from 'antd'
import { Input } from '../../components/ui/Input.jsx'
import { Textarea } from '../../components/ui/Textarea.jsx'
import { useMallCategoriesViewModel } from '../../viewmodels/useMallCategoriesViewModel.js'

/**
 * @param {{
 *   form: Record<string, unknown>
 *   setForm: import('react').Dispatch<import('react').SetStateAction<Record<string, unknown>>>
 *   disabled?: boolean
 * }} props
 */
export function MallCatalogEditorForm({ form, setForm, disabled = false }) {
  const { t } = useTranslation('pages')
  const {
    categories,
    subcategories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useMallCategoriesViewModel()

  const categoryOptions = useMemo(() => {
    /** @type {{ value: number, label: string }[]} */
    const options = []
    for (const category of categories.filter((row) => row.isActive)) {
      options.push({ value: Number(category.id), label: category.name })
    }
    for (const sub of subcategories.filter((row) => row.isActive)) {
      const parent = sub.categoryName || categories.find((c) => c.id === sub.categoryId)?.name
      options.push({
        value: Number(sub.id),
        label: parent ? `${parent} / ${sub.name}` : sub.name,
      })
    }
    const currentId = form.category_id ?? form.categoryId
    if (currentId != null && String(currentId).trim() !== '') {
      const idNum = Number(currentId)
      if (!options.some((option) => option.value === idNum)) {
        const label = String(form.categoryName ?? form.category ?? `#${currentId}`)
        options.unshift({ value: idNum, label })
      }
    }
    return options
  }, [categories, subcategories, form.category_id, form.categoryId, form.categoryName, form.category])

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const selectedCategoryId =
    form.category_id != null && String(form.category_id).trim() !== ''
      ? Number(form.category_id)
      : form.categoryId != null && String(form.categoryId).trim() !== ''
        ? Number(form.categoryId)
        : undefined

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input
        label={t('mallCatalog.editor.name')}
        name="name"
        value={String(form.name ?? '')}
        onChange={handleChange}
        required
        disabled={disabled}
        className="md:col-span-2"
      />
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {t('mallCatalog.editor.category')}
        </label>
        <Select
          showSearch
          optionFilterProp="label"
          className="w-full"
          size="large"
          loading={categoriesLoading}
          placeholder={
            categoriesLoading
              ? t('mallCatalog.editor.loadingCategories')
              : t('mallCatalog.editor.selectCategory')
          }
          value={selectedCategoryId}
          options={categoryOptions}
          disabled={disabled || categoriesLoading}
          onChange={(value) => {
            setForm((prev) => ({
              ...prev,
              category_id: value != null ? Number(value) : null,
              categoryId: value != null ? String(value) : '',
            }))
          }}
        />
        {categoriesError ? <p className="text-xs text-amber-600 mt-1">{categoriesError}</p> : null}
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <span className="text-sm font-medium text-slate-700">{t('mallCatalog.editor.active')}</span>
        <Switch
          // POST /api/malls/products doesn't default this to true — leaving it off screen at
          // create meant new catalog products stayed inactive with no dedicated toggle endpoint
          // to fix afterward (only a full update PUT).
          checked={form.is_active !== false}
          onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
          disabled={disabled}
        />
      </div>
      <Textarea
        label={t('mallCatalog.editor.description')}
        name="description"
        value={String(form.description ?? '')}
        onChange={handleChange}
        disabled={disabled}
        className="md:col-span-2"
        rows={4}
      />
    </div>
  )
}
