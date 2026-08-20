// View: edit product — PUT /api/products/{id}.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link, useLocation, useSearchParams } from 'react-router-dom'
import { Alert, Spin, message } from 'antd'
import * as productService from '../../services/productService.js'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useCategoriesViewModel } from '../../viewmodels/useCategoriesViewModel.js'
import { buildProductUpdatePayload } from '../../utils/productWritePayload.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ProductEditorForm } from './ProductEditorForm.jsx'
import { ProductVariantsInlineSection } from '../../components/products/ProductVariantsInlineSection.jsx'
import {
  normalizeVariantList,
  mapApiVariantToRow,
  reconcileVariantColorsWithProductOptions,
  parseVariantIdFromDto,
  getValidVariantRowsForSave,
  getIncompleteVariantRows,
  withDefaultedVariantPrices,
  withStandardVariantAttributes,
  findDuplicateVariantCombo,
  buildVariantCreatePayload,
  buildVariantUpdatePayload,
  isVariantOfferPriceMissing,
  isActiveVariantRow,
  variantStatusForApiRow,
  validateCustomAttributes,
  OPTION_ERROR_MESSAGE_KEYS,
} from '../../utils/productVariants.js'
import {
  categoriesForProductPicker,
  subcategoriesForProductPicker,
} from '../../utils/categoryPicker.js'

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

function findCategoryMatch(categories, value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const byId = categories.find((c) => String(c.id ?? '').trim() === normalized)
  if (byId) return { id: String(byId.id), name: String(byId.name ?? '').trim() }
  const target = normalized.toLowerCase()
  const byName = categories.find((c) => String(c.name ?? '').trim().toLowerCase() === target)
  if (byName) return { id: String(byName.id), name: String(byName.name ?? '').trim() }
  return null
}

function findSubcategoryMatch(subcategories, categoryId, value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const scoped = subcategories.filter((s) => !categoryId || String(s.categoryId) === String(categoryId))
  const byId = scoped.find((s) => String(s.id ?? '').trim() === normalized)
  if (byId) {
    return {
      id: String(byId.id),
      name: String(byId.name ?? '').trim(),
      categoryId: String(byId.categoryId ?? ''),
    }
  }
  const target = normalized.toLowerCase()
  const byName = scoped.find((s) => String(s.name ?? '').trim().toLowerCase() === target)
  if (byName) {
    return {
      id: String(byName.id),
      name: String(byName.name ?? '').trim(),
      categoryId: String(byName.categoryId ?? ''),
    }
  }
  return null
}

function variantUpdateFingerprint(row) {
  return JSON.stringify(buildVariantUpdatePayload(row))
}

/** A standard variant has no customer-selectable options (including repaired legacy rows). */
function isStandardPriceVariantRow(row) {
  if (row?.hasLegacyStandardAttribute) return true
  if (String(row?.color ?? '').trim() || String(row?.size ?? '').trim()) return false
  return !(Array.isArray(row?.customAttributes) ? row.customAttributes : []).some(
    (attribute) =>
      String(attribute?.name ?? '').trim() || String(attribute?.value ?? '').trim(),
  )
}

/** @param {unknown} images */
function mapExistingImages(images) {
  if (!Array.isArray(images)) return []
  const out = []
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (typeof img === 'object' && img != null && img.image) {
      out.push({
        id: img.id,
        storagePath: img.image,
        isFeatured: Boolean(img.is_featured),
      })
    } else if (typeof img === 'string') {
      out.push({ storagePath: img })
    }
  }
  return out
}

export function ProductEditPage() {
  const { t, i18n } = useTranslation('pages')
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const returnToParam = searchParams.get('return_to')
  const productsReturnTo =
    typeof returnToParam === 'string' && returnToParam.startsWith('/products')
      ? returnToParam
      : '/products'
  const variantsAnchorRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const queryClient = useQueryClient()
  const [removingImageIds, setRemovingImageIds] = useState(/** @type {(string | number)[]} */ ([]))
  const [removeAllBusy, setRemoveAllBusy] = useState(false)
  const [settingFeaturedId, setSettingFeaturedId] = useState(/** @type {string | number | null} */ (null))
  const [productSaving, setProductSaving] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)

  const storesQuery = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: () => storeService.listStores(),
  })

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: id != null && id !== '',
  })

  const variantsQuery = useQuery({
    queryKey: queryKeys.products.variants(id),
    queryFn: () => productService.listProductVariants(id),
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

  const [variantRows, setVariantRows] = useState([])
  const [variantsUiReady, setVariantsUiReady] = useState(false)
  const serverVariantIdsRef = useRef(/** @type {(string | number)[]} */ ([]))
  const initialVariantFingerprintsRef = useRef(new Map())
  const submitInFlightRef = useRef(false)
  const standardVariantPriceRef = useRef(/** @type {string | null} */ (null))
  const priceEditedRef = useRef(false)

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
    isActive: true,
    videoFile: null,
  })

  const pickerCategories = useMemo(
    () => categoriesForProductPicker(categories, { selectedCategoryId: form.categoryId }),
    [categories, form.categoryId],
  )
  const pickerSubcategories = useMemo(
    () =>
      subcategoriesForProductPicker(subcategories, categories, {
        selectedSubcategoryId: form.subCategoryId,
      }),
    [subcategories, categories, form.subCategoryId],
  )
  const validVariantRows = getValidVariantRowsForSave(variantRows)
  const variantPricingManaged =
    validVariantRows.length > 0 || variantRows.some((row) => row.variantId != null)

  const raw = productQuery.data

  useEffect(() => {
    setVariantsUiReady(false)
    setVariantRows([])
    serverVariantIdsRef.current = []
    initialVariantFingerprintsRef.current = new Map()
    standardVariantPriceRef.current = null
    priceEditedRef.current = false
  }, [id])

  useEffect(() => {
    if (variantsUiReady) return
    if (!raw) return
    if (variantsQuery.isPending) return
    const list = variantsQuery.isError
      ? []
      : normalizeVariantList(variantsQuery.data ?? [])
    const lang = String(i18n.resolvedLanguage || i18n.language || 'ar').split('-')[0]
    const apiRows = list.map((v) => mapApiVariantToRow(v, lang))
    const rows = reconcileVariantColorsWithProductOptions(
      apiRows,
      normalizeColorsFromApi(raw?.colors),
    )
    setVariantRows(rows)
    const standardPriceRow = rows.find(isStandardPriceVariantRow)
    if (standardPriceRow?.price != null && String(standardPriceRow.price).trim() !== '') {
      standardVariantPriceRef.current = String(standardPriceRow.price)
      if (!priceEditedRef.current) {
        setForm((current) => ({ ...current, price: standardVariantPriceRef.current }))
      }
    }
    serverVariantIdsRef.current = list.map((v) => parseVariantIdFromDto(v)).filter((vid) => vid != null)
    initialVariantFingerprintsRef.current = new Map(
      rows
        .filter((row) => row.variantId != null)
        .map((row) => [Number(row.variantId), variantUpdateFingerprint(row)]),
    )
    setVariantsUiReady(true)
  }, [raw, variantsQuery.isPending, variantsQuery.isError, variantsQuery.data, variantsUiReady, i18n])

  useLayoutEffect(() => {
    if (location.hash !== '#variants') return
    if (!raw) return
    const el = variantsAnchorRef.current
    if (!el) return
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(raf)
  }, [location.hash, raw])

  const commitVariantStatusToApi = useCallback(
    async (variantId, status) => {
      await productService.updateProductVariant(id, variantId, {
        status: variantStatusForApiRow({ status }),
      })
      const numericId = Number(variantId)
      const previous = initialVariantFingerprintsRef.current.get(numericId)
      if (previous) {
        const baseline = JSON.parse(previous)
        baseline.status = variantStatusForApiRow({ status })
        initialVariantFingerprintsRef.current.set(numericId, JSON.stringify(baseline))
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(id),
        refetchType: 'none',
      })
    },
    [id, queryClient],
  )

  const handlePersistedVariantRemove = useCallback(
    async (row) => {
      if (row.variantId == null) return
      const productNum = Number(id)
      if (
        row.productId != null &&
        Number.isFinite(productNum) &&
        Number(row.productId) !== productNum
      ) {
        message.error(t('products.variants.deleteErr'))
        throw new Error('Variant does not belong to this product')
      }
      try {
        await productService.deleteProductVariant(productNum, row.variantId)
      } catch (err) {
        const detail = String(err?.message ?? '')
        message.error(
          detail.includes('Cannot delete the last active variant of a product')
            ? t('products.variants.lastActiveRequired')
            : detail || t('products.variants.deleteErr'),
        )
        throw err
      }
      serverVariantIdsRef.current = serverVariantIdsRef.current.filter(
        (vid) => Number(vid) !== Number(row.variantId),
      )
      initialVariantFingerprintsRef.current.delete(Number(row.variantId))
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.root,
        refetchType: 'none',
      })
      message.success(t('products.variants.deleted'))
    },
    [id, queryClient, t],
  )

  const handleRemoveVariantImage = useCallback(
    async (row, image) => {
      if (row.variantId == null || image?.id == null) return
      await productService.deleteProductVariantImage(id, row.variantId, image.id)
    },
    [id],
  )

  const existingImages = useMemo(() => mapExistingImages(raw?.images), [raw?.images])

  async function handleRemoveExistingImage(imageId) {
    setRemovingImageIds((prev) => [...prev, imageId])
    try {
      await productService.deleteProductImage(id, imageId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
      message.success(t('products.edit.imageRemoved'))
    } catch (err) {
      message.error(err?.message ?? t('products.edit.imageRemoveErr'))
    } finally {
      setRemovingImageIds((prev) => prev.filter((x) => x !== imageId))
    }
  }

  async function handleSetFeaturedImage(imageId) {
    setSettingFeaturedId(imageId)
    try {
      await productService.setFeaturedProductImage(id, imageId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
      message.success(t('products.edit.coverUpdated'))
    } catch (err) {
      message.error(err?.message ?? t('products.edit.coverErr'))
    } finally {
      setSettingFeaturedId(null)
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
      message.success(t('products.edit.allRemoved'))
    } catch (err) {
      message.error(err?.message ?? t('products.edit.allRemoveErr'))
    } finally {
      setRemoveAllBusy(false)
      setRemovingImageIds([])
    }
  }

  const hydratedProductIdRef = useRef(/** @type {string | null} */ (null))
  const hydratedCategoryProductIdRef = useRef(/** @type {string | null} */ (null))
  const [descriptionResetTick, setDescriptionResetTick] = useState(0)

  useEffect(() => {
    if (!raw) return
    // Only hydrate the form from the server once per product. Background refetches
    // (window-focus refetch, cache invalidation from image/variant actions) update `raw`
    // without the user's consent to discard in-progress edits — a full setForm here would
    // silently wipe unsaved changes (e.g. text just pasted into the description editor).
    if (hydratedProductIdRef.current === id) return
    hydratedProductIdRef.current = id
    setDescriptionResetTick((t) => t + 1)
    setForm({
      storeId: raw?.store_id != null ? String(raw.store_id) : '',
      name: raw?.name ?? '',
      categoryId:
        raw?.category_id != null
          ? String(raw.category_id)
          : raw?.category_details?.id != null
            ? String(raw.category_details.id)
            : '',
      category: raw?.category ?? raw?.category_details?.name ?? '',
      subCategoryId: '',
      subCategory: raw?.sub_category ?? '',
      sizes: normalizeSizesFromApi(raw?.size),
      colors: normalizeColorsFromApi(raw?.colors),
      imageFiles: [],
      description: raw?.description ?? '',
      price:
        standardVariantPriceRef.current ?? (raw?.price != null ? String(raw.price) : ''),
      isOffer: Boolean(raw?.is_offer),
      newPrice: raw?.new_price != null ? String(raw.new_price) : '',
      isActive: Boolean(raw?.is_active ?? true),
      videoFile: null,
    })
  }, [raw, id])

  useEffect(() => {
    if (!raw) return
    if (categories.length === 0) return
    // Category data can arrive after the product. Resolve it once, then preserve user edits when
    // product queries are invalidated by image/variant actions or background refetches.
    if (hydratedCategoryProductIdRef.current === id) return
    const rawCategoryId = raw?.category_id ?? raw?.category_details?.id ?? null
    const asCategory = findCategoryMatch(categories, rawCategoryId)
    const asSubcategory =
      asCategory == null ? findSubcategoryMatch(subcategories, '', rawCategoryId) : null

    const fallbackCategoryByName = findCategoryMatch(categories, raw?.category)
    const fallbackSubByName = findSubcategoryMatch(
      subcategories,
      fallbackCategoryByName?.id ?? '',
      raw?.sub_category,
    )

    const nextCategoryId =
      asCategory?.id ??
      asSubcategory?.categoryId ??
      fallbackCategoryByName?.id ??
      fallbackSubByName?.categoryId ??
      ''
    const nextCategoryName =
      categories.find((c) => String(c.id) === String(nextCategoryId))?.name ??
      fallbackCategoryByName?.name ??
      (raw?.category != null
        ? String(raw.category).trim()
        : raw?.category_details?.parent?.name != null
          ? String(raw.category_details.parent.name).trim()
          : '')

    const subcategoryFromId =
      asSubcategory != null ? findSubcategoryMatch(subcategories, nextCategoryId, asSubcategory.id) : null
    const subcategoryMatch =
      subcategoryFromId ??
      findSubcategoryMatch(
        subcategories,
        nextCategoryId,
        raw?.sub_category ?? raw?.category_details?.name,
      )
    const nextSubCategoryId = subcategoryMatch?.id ?? ''
    const nextSubCategoryName =
      subcategoryMatch?.name ??
      (raw?.sub_category != null
        ? String(raw.sub_category).trim()
        : raw?.category_details?.depth > 0 && raw?.category_details?.name != null
          ? String(raw.category_details.name).trim()
          : '')
    setForm((prev) => ({
      ...prev,
      categoryId: nextCategoryId,
      category: nextCategoryName,
      subCategoryId: nextSubCategoryId,
      subCategory: nextSubCategoryName,
    }))
    hydratedCategoryProductIdRef.current = id
  }, [categories, subcategories, raw, id])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitInFlightRef.current) return
    // Category (like store/price on create) is optional — omitted from the PUT payload when
    // unset, so a product can stay category-less across edits until someone fills it in.

    const standardizedVariantRows = withStandardVariantAttributes(
      variantRows,
      form.colors,
      form.sizes,
    )
    const legacyStandardVariantIds = new Set(
      variantRows
        .filter((row) => row.variantId != null && row.hasLegacyStandardAttribute)
        .map((row) => Number(row.variantId)),
    )
    // Color/size attributes identify a variant and should not be rewritten in place. When a
    // legacy `standard` row is reused for a real color/size combination, treat it as a new row;
    // the old row is deactivated and removed before the product options are updated below.
    const legacyVariantIdsToReplace = new Set(
      standardizedVariantRows
        .filter(
          (row) =>
            row.variantId != null &&
            legacyStandardVariantIds.has(Number(row.variantId)) &&
            !row.hasLegacyStandardAttribute,
        )
        .map((row) => Number(row.variantId)),
    )
    const replacementReadyRows = standardizedVariantRows.map((row) => {
      const oldVariantId = Number(row.variantId)
      if (!legacyVariantIdsToReplace.has(oldVariantId)) return row
      return {
        ...row,
        variantId: null,
        productId: null,
        replacesLegacyVariantId: oldVariantId,
      }
    })
    const defaultedVariantRows = withDefaultedVariantPrices(replacementReadyRows, form.price)
    const incompleteVariants = getIncompleteVariantRows(defaultedVariantRows)
    if (incompleteVariants.length > 0) {
      message.error(t('products.variants.priceRequiredForRow'))
      return
    }
    const validVariants = getValidVariantRowsForSave(defaultedVariantRows)
    const remainingPersistedVariantIds = new Set(
      variantRows
        .filter(
          (row) =>
            row.variantId != null &&
            !legacyVariantIdsToReplace.has(Number(row.variantId)),
        )
        .map((row) => Number(row.variantId)),
    )
    const hasActiveVariantAfterSave =
      variantRows.some((row) => row.variantId != null && isActiveVariantRow(row)) ||
      validVariants.some((row) => row.variantId == null && isActiveVariantRow(row))
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
    if (validVariants.length > 0 && !hasActiveVariantAfterSave) {
      message.error(t('products.variants.lastActiveRequired'))
      return
    }

    try {
      submitInFlightRef.current = true
      setProductSaving(true)
      for (const legacyVariantId of legacyVariantIdsToReplace) {
        await productService.updateProductVariant(id, legacyVariantId, { status: 'inactive' })
        await productService.deleteProductVariant(Number(id), legacyVariantId)
      }
      const baselineCategoryId =
        raw?.category_id ?? raw?.category_details?.id ?? form.subCategoryId ?? form.categoryId
      const updateOptions = {
        baselineCategoryId,
        hasVariants: validVariants.length > 0,
      }
      try {
        await productService.updateProduct(id, buildProductUpdatePayload(form, updateOptions))
      } catch (err) {
        const detail = String(err?.message ?? '')
        if (!detail.includes('pricing is managed by variants')) throw err
        await productService.updateProduct(
          id,
          buildProductUpdatePayload(form, {
            ...updateOptions,
            hasVariants: true,
          }),
        )
      }
      const files = Array.isArray(form.imageFiles) ? form.imageFiles : []
      if (files.length > 0) {
        try {
          await productService.uploadProductImages(id, files)
        } catch (err) {
          message.warning(err?.message ?? t('products.edit.imageUploadWarn'))
        }
      }
      if (form.videoFile instanceof File) {
        try {
          setVideoUploading(true)
          await productService.uploadProductVideo(id, form.videoFile)
        } catch (err) {
          message.warning(err?.message ?? t('products.edit.videoUploadWarn'))
        } finally {
          setVideoUploading(false)
        }
      }

      const idsAtLoad = [...serverVariantIdsRef.current]
      const rowsToCreate = validVariants.filter((row) => row.variantId == null)
      const rowsToUpdate = validVariants.filter((row) => {
        if (row.variantId == null) return false
        if (row.hasLegacyStandardAttribute) return true
        if (Array.isArray(row.imageFiles) && row.imageFiles.length > 0) return true
        const baseline = initialVariantFingerprintsRef.current.get(Number(row.variantId))
        return baseline == null || variantUpdateFingerprint(row) !== baseline
      })
      const rowsToUpdateActive = rowsToUpdate.filter(isActiveVariantRow)
      const rowsToUpdateNonActive = rowsToUpdate.filter((row) => !isActiveVariantRow(row))

      // Images never travel in the create/update JSON body (see buildVariantCreatePayload's
      // note) — pending new files are uploaded through the dedicated per-variant endpoint right
      // after the variant exists.
      async function uploadPendingRowImages(variantId, row) {
        const files = Array.isArray(row.imageFiles) ? row.imageFiles : []
        if (files.length === 0 || variantId == null) return
        try {
          await productService.uploadProductVariantImages(id, variantId, files)
        } catch (imgErr) {
          message.warning(imgErr?.message ?? t('products.variants.imageUploadWarn'))
        }
      }

      for (let i = 0; i < rowsToCreate.length; i++) {
        const row = rowsToCreate[i]
        const created = await productService.createProductVariantWithInitialStatus(
          id,
          buildVariantCreatePayload(row),
          row,
        )
        await uploadPendingRowImages(created?.id ?? created?.variant_id, row)
      }

      for (let i = 0; i < rowsToUpdateActive.length; i++) {
        const row = rowsToUpdateActive[i]
        await productService.updateProductVariant(id, row.variantId, buildVariantUpdatePayload(row))
        await uploadPendingRowImages(row.variantId, row)
      }

      for (let i = 0; i < idsAtLoad.length; i++) {
        const vid = Number(idsAtLoad[i])
        if (
          !legacyVariantIdsToReplace.has(vid) &&
          !remainingPersistedVariantIds.has(vid)
        ) {
          await productService.deleteProductVariant(Number(id), vid)
        }
      }

      for (let i = 0; i < rowsToUpdateNonActive.length; i++) {
        const row = rowsToUpdateNonActive[i]
        await productService.updateProductVariant(id, row.variantId, buildVariantUpdatePayload(row))
        await uploadPendingRowImages(row.variantId, row)
      }

      // Mark all product caches stale without refetching the edit page immediately before it
      // unmounts. The destination list fetches once when it becomes active.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.products.root,
        refetchType: 'none',
      })
      navigate(productsReturnTo)
    } catch (err) {
      const detail = String(err?.message ?? '')
      if (detail.includes('no field "category"') || detail.includes("no field 'category'")) {
        message.error(t('products.edit.backendCategorySchemaError'))
      } else if (detail.includes('pricing is managed by variants')) {
        message.error(t('products.edit.variantPricingManagedByApi'))
      } else if (detail.includes('Cannot delete the last active variant of a product')) {
        message.error(t('products.variants.lastActiveRequired'))
      } else {
        message.error(detail || t('products.variants.syncErr'))
      }
    } finally {
      submitInFlightRef.current = false
      setProductSaving(false)
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
        <Alert type="error" title={loadError || t('products.edit.loadError')} showIcon />
        <Button as={Link} variant="ghost" to={productsReturnTo}>
          {t('products.edit.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {storesError ? <Alert type="warning" title={storesError} showIcon className="mb-2" /> : null}

      <Card title={t('products.edit.title', { id })}>
        <form onSubmit={handleSubmit}>
          <ProductEditorForm
            stores={stores}
            storesLoading={storesLoading}
            storeSelectLocked
            form={form}
            setForm={setForm}
            categories={pickerCategories}
            subcategories={pickerSubcategories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
            existingImages={existingImages}
            productId={id}
            descriptionResetKey={`${id ?? 'new'}:${descriptionResetTick}`}
            onRemoveExistingImage={handleRemoveExistingImage}
            onRemoveAllExistingImages={handleRemoveAllExistingImages}
            removingImageIds={removingImageIds}
            removeAllBusy={removeAllBusy}
            onSetFeaturedImage={handleSetFeaturedImage}
            settingFeaturedId={settingFeaturedId}
            variantPricingManaged={variantPricingManaged}
            onPriceChange={(value) => {
              priceEditedRef.current = true
              setVariantRows((rows) =>
                rows.map((row) =>
                  isStandardPriceVariantRow(row) ? { ...row, price: value } : row,
                ),
              )
            }}
            videoUploading={videoUploading}
            variantsAnchorRef={variantsAnchorRef}
            variantsSlot={
              !variantsUiReady ? (
                <div className="flex justify-center py-12">
                  <Spin />
                </div>
              ) : (
                <ProductVariantsInlineSection
                  variantRows={variantRows}
                  setVariantRows={setVariantRows}
                  productColors={Array.isArray(form.colors) ? form.colors : []}
                  productSizes={Array.isArray(form.sizes) ? form.sizes : []}
                  showStatusColumn
                  // Backend confirmed PATCH .../variants/{id} supports a full-replace of
                  // `attributes` — color/size/custom options are editable on existing variants,
                  // not just at creation. buildVariantUpdatePayload already sends the row's full
                  // attribute set on every update, so no other change is needed here.
                  productId={id}
                  onPersistedVariantRemove={handlePersistedVariantRemove}
                  onCommitVariantStatus={commitVariantStatusToApi}
                  onRemoveVariantImage={handleRemoveVariantImage}
                />
              )
            }
          >
            <Button type="button" variant="ghost" as={Link} to={productsReturnTo}>
              {t('products.edit.cancel')}
            </Button>
            <Button type="submit" disabled={productSaving || videoUploading || !variantsUiReady}>
              {productSaving || videoUploading ? t('products.edit.saving') : t('products.edit.submit')}
            </Button>
          </ProductEditorForm>
        </form>
      </Card>
    </div>
  )
}
