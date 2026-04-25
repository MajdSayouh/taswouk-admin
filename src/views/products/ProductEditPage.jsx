// View: edit product — PUT /api/products/{id}.
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Alert, Spin, message } from 'antd'
import * as productService from '../../services/productService.js'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useCategoriesViewModel } from '../../viewmodels/useCategoriesViewModel.js'
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ProductEditorForm } from './ProductEditorForm.jsx'

function commaSplit(s) {
  if (s == null || String(s).trim() === '') return []
  return String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function normalizeSizesFromApi(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  return commaSplit(raw)
}

function normalizeColorsFromApi(raw) {
  if (Array.isArray(raw)) return raw.map((c) => String(c).trim()).filter(Boolean)
  return commaSplit(raw)
}

function findCategoryIdByName(categories, name) {
  const target = String(name ?? '').trim().toLowerCase()
  if (!target) return ''
  const hit = categories.find((c) => String(c.name ?? '').trim().toLowerCase() === target)
  return hit ? String(hit.id) : ''
}

function findSubcategoryIdByName(subcategories, categoryId, name) {
  const target = String(name ?? '').trim().toLowerCase()
  if (!target) return ''
  const scoped = subcategories.filter((s) => !categoryId || String(s.categoryId) === String(categoryId))
  const hit = scoped.find((s) => String(s.name ?? '').trim().toLowerCase() === target)
  return hit ? String(hit.id) : ''
}

/** @param {unknown} images */
function mapExistingImages(images) {
  if (!Array.isArray(images)) return []
  const out = []
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (typeof img === 'object' && img != null && img.image) {
      out.push({ id: img.id, storagePath: img.image })
    } else if (typeof img === 'string') {
      out.push({ storagePath: img })
    }
  }
  return out
}

export function ProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [removingImageIds, setRemovingImageIds] = useState(/** @type {(string | number)[]} */ ([]))
  const [removeAllBusy, setRemoveAllBusy] = useState(false)
  const { updateProduct, saving, error } = useProductsViewModel({
    fetchOnMount: false,
  })

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: () => storeService.listStores(),
  })

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: id != null && id !== '',
  })

  const stores = Array.isArray(storesQuery.data) ? storesQuery.data : []
  const storesLoading = storesQuery.isFetching
  const storesError = storesQuery.error?.message ?? null
  const {
    categories,
    subcategories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategoriesViewModel()

  const [form, setForm] = useState({
    storeId: '',
    name: '',
    categoryId: '',
    category: '',
    subCategoryId: '',
    subCategory: '',
    sizes: [],
    colors: [],
    imageFiles: [],
    description: '',
    price: '',
    isOffer: false,
    newPrice: '',
    rate: '1',
    isActive: true,
  })

  const raw = productQuery.data

  const existingImages = useMemo(() => mapExistingImages(raw?.images), [raw?.images])

  async function handleRemoveExistingImage(imageId) {
    setRemovingImageIds((prev) => [...prev, imageId])
    try {
      await productService.deleteProductImage(id, imageId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
      message.success('Image removed')
    } catch (err) {
      message.error(err?.message ?? 'Could not remove image')
    } finally {
      setRemovingImageIds((prev) => prev.filter((x) => x !== imageId))
    }
  }

  async function handleRemoveAllExistingImages() {
    const imgs = existingImages.filter((img) => img.id != null)
    if (!imgs.length) return
    setRemoveAllBusy(true)
    setRemovingImageIds(imgs.map((i) => i.id))
    try {
      await Promise.all(imgs.map((img) => productService.deleteProductImage(id, img.id)))
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
      message.success('All images removed')
    } catch (err) {
      message.error(err?.message ?? 'Could not remove all images')
    } finally {
      setRemoveAllBusy(false)
      setRemovingImageIds([])
    }
  }

  useEffect(() => {
    if (!raw) return
    setForm({
      storeId: raw?.store_id != null ? String(raw.store_id) : '',
      name: raw?.name ?? '',
      categoryId: '',
      category: raw?.category ?? '',
      subCategoryId: '',
      subCategory: raw?.sub_category ?? '',
      sizes: normalizeSizesFromApi(raw?.size),
      colors: normalizeColorsFromApi(raw?.colors),
      imageFiles: [],
      description: raw?.description ?? '',
      price: raw?.price != null ? String(raw.price) : '',
      isOffer: Boolean(raw?.is_offer),
      newPrice: raw?.new_price != null ? String(raw.new_price) : '',
      rate: raw?.rate != null ? String(raw.rate) : '1',
      isActive: Boolean(raw?.is_active ?? true),
    })
  }, [raw])

  useEffect(() => {
    if (!raw) return
    const nextCategoryId = findCategoryIdByName(categories, raw?.category)
    const nextSubCategoryId = findSubcategoryIdByName(
      subcategories,
      nextCategoryId,
      raw?.sub_category,
    )
    setForm((prev) => ({
      ...prev,
      categoryId: nextCategoryId,
      subCategoryId: nextSubCategoryId,
    }))
  }, [categories, subcategories, raw])

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      await updateProduct(id, form)
      const files = Array.isArray(form.imageFiles) ? form.imageFiles : []
      if (files.length > 0) {
        try {
          await productService.uploadProductImages(id, files)
        } catch (err) {
          message.warning(
            err?.message ??
              'Changes were saved but some images failed to upload. Remove files and try again.',
          )
        }
      }
      navigate('/admin/products')
    } catch {
      // Alert shows error
    }
  }

  if (productQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  const loadError = productQuery.error?.message ?? null
  if (loadError || productQuery.isError) {
    return (
      <div className="space-y-4">
        <Alert type="error" title={loadError || 'Failed to load product'} showIcon />
        <Button as={Link} variant="ghost" to="/admin/products">
          Back to products
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {storesError ? <Alert type="warning" title={storesError} showIcon className="mb-2" /> : null}
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title={`Edit product #${id}`}>
        <form onSubmit={handleSubmit}>
          <ProductEditorForm
            stores={stores}
            storesLoading={storesLoading}
            storeSelectLocked
            form={form}
            setForm={setForm}
            categories={categories}
            subcategories={subcategories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            existingImages={existingImages}
            productId={id}
            onRemoveExistingImage={handleRemoveExistingImage}
            onRemoveAllExistingImages={handleRemoveAllExistingImages}
            removingImageIds={removingImageIds}
            removeAllBusy={removeAllBusy}
          >
            <Button type="button" variant="ghost" as={Link} to={`/admin/products/${id}`}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </ProductEditorForm>
        </form>
      </Card>
    </div>
  )
}
