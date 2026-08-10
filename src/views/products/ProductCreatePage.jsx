// View: create product (POST /api/products/).
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { Alert, message } from 'antd'
import * as storeService from '../../services/storeService.js'
import * as productService from '../../services/productService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel'
import { useCategoriesViewModel } from '../../viewmodels/useCategoriesViewModel.js'
import { useAuthStore, isSellerRole } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ProductEditorForm } from './ProductEditorForm.jsx'
import { ProductVariantsInlineSection } from '../../components/products/ProductVariantsInlineSection.jsx'
import {
  getValidVariantRowsForSave,
  getIncompleteVariantRows,
  withDefaultedVariantPrices,
  withStandardVariantAttributes,
  findDuplicateVariantCombo,
  buildVariantCreatePayload,
  isVariantOfferPriceMissing,
  validateCustomAttributes,
  OPTION_ERROR_MESSAGE_KEYS,
} from '../../utils/productVariants.js'
import {
  categoriesForProductPicker,
  subcategoriesForProductPicker,
} from '../../utils/categoryPicker.js'

function emptyForm() {
  return {
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
    isActive: true,
    videoFile: null,
  }
}

export function ProductCreatePage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { createProduct, saving, error } = useProductsViewModel({ fetchOnMount: false })

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: () => storeService.listStores(),
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

  const pickerCategories = useMemo(
    () => categoriesForProductPicker(categories, {}),
    [categories],
  )
  const pickerSubcategories = useMemo(
    () => subcategoriesForProductPicker(subcategories, categories, {}),
    [subcategories, categories],
  )

  const [form, setForm] = useState(emptyForm)
  const [variantRows, setVariantRows] = useState([])
  const [videoUploading, setVideoUploading] = useState(false)
  const validVariantRows = getValidVariantRowsForSave(variantRows)
  const variantPricingManaged = validVariantRows.length > 0

  useEffect(() => {
    if (
      user &&
      isSellerRole(user.role) &&
      stores.length === 1 &&
      stores[0]?.id != null
    ) {
      setForm((prev) => ({ ...prev, storeId: String(stores[0].id) }))
    }
  }, [user, stores])

  async function handleSubmit(event) {
    event.preventDefault()
    // Only `name` is required to create a product — store, category, price, images, etc. can all
    // be filled in later over one or more edits. If the backend still requires store_id/
    // category_id at the schema level, the create call below will surface that as a clear
    // validation error instead of silently blocking here.
    if (!String(form.name ?? '').trim()) {
      message.error(t('products.editor.nameRequired'))
      return
    }

    const standardizedVariantRows = withStandardVariantAttributes(
      variantRows,
      form.colors,
      form.sizes,
    )
    const defaultedVariantRows = withDefaultedVariantPrices(standardizedVariantRows, form.price)
    const incompleteVariants = getIncompleteVariantRows(defaultedVariantRows)
    if (incompleteVariants.length > 0) {
      message.error(t('products.variants.priceRequiredForRow'))
      return
    }
    const validVariants = getValidVariantRowsForSave(defaultedVariantRows)
    if (findDuplicateVariantCombo(validVariants)) {
      message.error(t('products.variants.duplicateCombo'))
      return
    }
    if (validVariants.some(isVariantOfferPriceMissing)) {
      message.error(t('products.variants.offerPriceRequired'))
      return
    }
    const optionsError = validVariants
      .map((row) => validateCustomAttributes(row.customAttributes))
      .find(Boolean)
    if (optionsError) {
      message.error(t(OPTION_ERROR_MESSAGE_KEYS[optionsError]))
      return
    }

    try {
      const created = await createProduct(form, { hasVariants: validVariants.length > 0 })
      const pid = created?.id
      const files = Array.isArray(form.imageFiles) ? form.imageFiles : []
      if (pid != null && files.length > 0) {
        try {
          await productService.uploadProductImages(pid, files, {
            featuredIndex: files.length === 1 ? 0 : undefined,
          })
        } catch (err) {
          message.warning(err?.message ?? t('products.create.imageUploadWarn'))
        }
      }
      if (pid != null && form.videoFile instanceof File) {
        try {
          setVideoUploading(true)
          await productService.uploadProductVideo(pid, form.videoFile)
        } catch (err) {
          message.warning(err?.message ?? t('products.create.videoUploadWarn'))
        } finally {
          setVideoUploading(false)
        }
      }
      if (pid != null && validVariants.length > 0) {
        try {
          for (let i = 0; i < validVariants.length; i++) {
            const row = validVariants[i]
            const imagePaths = await productService.resolveVariantRowImagePaths(pid, row)
            await productService.createProductVariantWithInitialStatus(
              pid,
              buildVariantCreatePayload(row, imagePaths),
              row,
            )
          }
        } catch (err) {
          message.error(err?.message ?? t('products.variants.syncErr'))
          navigate(`/products/${pid}/edit`)
          return
        }
      }
      if (pid != null) {
        message.success(
          validVariants.length > 0 ? t('products.create.createdWithVariantsHint') : t('products.create.success'),
        )
        navigate('/products')
      } else {
        navigate('/products')
      }
    } catch {
      // Error surfaced via Alert
    }
  }

  return (
    <div className="space-y-6">
      {storesError ? <Alert type="warning" title={storesError} showIcon /> : null}
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title={t('products.create.title')}>
        <form onSubmit={handleSubmit}>
          <ProductEditorForm
            stores={stores}
            storesLoading={storesLoading}
            form={form}
            setForm={setForm}
            categories={pickerCategories}
            subcategories={pickerSubcategories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            variantPricingManaged={variantPricingManaged}
            videoUploading={videoUploading}
            variantsSlot={
              <ProductVariantsInlineSection
                variantRows={variantRows}
                setVariantRows={setVariantRows}
                productColors={Array.isArray(form.colors) ? form.colors : []}
                productSizes={Array.isArray(form.sizes) ? form.sizes : []}
                showStatusColumn
              />
            }
          >
            <Button type="button" variant="ghost" as={Link} to="/products">
              {t('products.create.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving || videoUploading ? t('shared.creating') : t('products.create.submit')}
            </Button>
          </ProductEditorForm>
        </form>
      </Card>
    </div>
  )
}
