/**
 * Products ViewModel — list, create, update, delete via `productService` (TanStack Query).
 */
import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as productService from '../services/productService.js'
import { createProduct as toProductModel } from '../models/Product.js'
import { queryKeys } from '../query/queryKeys.js'

function commaToArray(s) {
  if (s == null || String(s).trim() === '') return []
  return String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** @param {Record<string, unknown>} form */
function sizesFromForm(form) {
  if (Array.isArray(form.sizes)) return form.sizes.map((x) => String(x).trim()).filter(Boolean)
  return commaToArray(form.sizeStr ?? '')
}

/** @param {Record<string, unknown>} form */
function colorsFromForm(form) {
  if (Array.isArray(form.colors)) {
    const arr = form.colors.map((c) => String(c).trim()).filter(Boolean)
    return arr.length ? arr : null
  }
  const legacy = commaToArray(form.colorsStr ?? '')
  return legacy.length ? legacy : null
}

function categoryMode() {
  const mode = String(import.meta.env.VITE_PRODUCT_CATEGORY_VALUE_MODE || 'name')
    .trim()
    .toLowerCase()
  return mode === 'id' ? 'id' : 'name'
}

/** @param {Record<string, unknown>} form */
function categoryValueFromForm(form) {
  if (categoryMode() === 'id') {
    const raw = form.categoryId ?? form.category
    if (raw == null || String(raw).trim() === '') return null
    return String(raw).trim()
  }
  if (form.category == null || String(form.category).trim() === '') return null
  return String(form.category).trim()
}

/** @param {Record<string, unknown>} form */
function subcategoryValueFromForm(form) {
  if (categoryMode() === 'id') {
    const raw = form.subCategoryId ?? form.subCategory
    if (raw == null || String(raw).trim() === '') return null
    return String(raw).trim()
  }
  if (form.subCategory == null || String(form.subCategory).trim() === '') return null
  return String(form.subCategory).trim()
}

function formatCategoryLabel(item) {
  const parts = [item.category, item.sub_category].filter(
    (x) => x != null && String(x).trim() !== '',
  )
  if (parts.length) return parts.join(' · ')
  if (item.description?.trim()) return String(item.description).slice(0, 48)
  return '—'
}

function mapItemToProduct(item) {
  const storeId = item.store_id
  return {
    ...toProductModel({
      id: String(item.id ?? ''),
      name: item.name ?? '',
      sku: item.id != null ? `PRD-${item.id}` : '',
      category: formatCategoryLabel(item),
      price: item.price,
      stock: 0,
      isActive: item.is_active ?? true,
    }),
    storeId: storeId != null ? String(storeId) : '',
    isOffer: Boolean(item.is_offer),
    newPrice: item.new_price != null ? Number(item.new_price) : null,
    rate: item.rate != null ? Number(item.rate) : null,
  }
}

/** Normalize GET /api/products/ response (array or wrapped). */
function normalizeProductList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  if (data && Array.isArray(data.items)) return data.items
  return []
}

/**
 * Build API payload from editor form state (create).
 * @param {Record<string, unknown>} form
 */
export function buildProductCreatePayload(form) {
  const size = sizesFromForm(form)
  const colors = colorsFromForm(form)
  const rateNum = form.rate === '' || form.rate == null ? 1 : Math.min(5, Math.max(1, Number(form.rate)))
  const priceNum = form.price === '' ? 0 : Number(form.price)
  const newPrice =
    form.isOffer && form.newPrice !== '' && form.newPrice != null
      ? Number(form.newPrice)
      : null

  return {
    store_id: Number(form.storeId),
    name: String(form.name).trim(),
    category: categoryValueFromForm(form),
    sub_category: subcategoryValueFromForm(form),
    size,
    colors,
    description: form.description?.trim() || null,
    price: Number.isFinite(priceNum) ? priceNum : 0,
    is_offer: Boolean(form.isOffer),
    new_price: newPrice,
    rate: Number.isFinite(rateNum) ? rateNum : 1,
    is_active: form.isActive !== false,
  }
}

/**
 * @param {Record<string, unknown>} form
 * @returns {Parameters<typeof import('../services/productService.js').updateProduct>[1]}
 */
export function buildProductUpdatePayload(form) {
  const size = sizesFromForm(form)
  const colors = colorsFromForm(form)
  const rateNum =
    form.rate === '' || form.rate == null ? null : Math.min(5, Math.max(1, Number(form.rate)))
  const newPrice =
    form.isOffer && form.newPrice !== '' && form.newPrice != null
      ? Number(form.newPrice)
      : null

  return {
    name: form.name?.trim() || null,
    category: categoryValueFromForm(form),
    sub_category: subcategoryValueFromForm(form),
    size: size.length ? size : null,
    colors,
    description: form.description?.trim() || null,
    price: form.price === '' || form.price == null ? null : Number(form.price),
    is_offer: form.isOffer != null ? Boolean(form.isOffer) : null,
    new_price: newPrice,
    rate: rateNum,
    is_active: form.isActive != null ? Boolean(form.isActive) : null,
  }
}

function invalidateProductQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
}

export function useProductsViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const controlledListParams = options.listParams
  const controlledEnabled = options.enabled

  const [internalParams, setInternalParams] = useState({})
  const [internalUnlocked, setInternalUnlocked] = useState(fetchOnMount)

  const isControlled = controlledListParams !== undefined
  const listParams = isControlled ? controlledListParams : internalParams

  const queryEnabled =
    controlledEnabled !== undefined ? controlledEnabled : internalUnlocked

  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.products.list(listParams),
    queryFn: async () => {
      const q = listParams
      const params =
        Object.keys(q).length > 0
          ? Object.fromEntries(Object.entries(q).filter(([, v]) => v != null && v !== ''))
          : undefined
      const raw = await productService.getProducts(params)
      const items = normalizeProductList(raw)
      return items.map(mapItemToProduct)
    },
    enabled: queryEnabled,
  })

  const createMutation = useMutation({
    mutationFn: async (form) => {
      const payload = buildProductCreatePayload(form)
      return productService.createProduct(payload)
    },
    onSuccess: () => invalidateProductQueries(queryClient),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ productId, form }) => {
      const payload = buildProductUpdatePayload(form)
      return productService.updateProduct(productId, payload)
    },
    onSuccess: (_, { productId }) => {
      invalidateProductQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (productId) => productService.deleteProduct(productId),
    onSuccess: () => invalidateProductQueries(queryClient),
  })

  const refetchList = listQuery.refetch

  const fetchProductsWithRefetch = useCallback(
    async (query) => {
      if (!isControlled) {
        if (query !== undefined) {
          setInternalParams(query && typeof query === 'object' ? query : {})
        }
        setInternalUnlocked(true)
        if (query === undefined) {
          await refetchList()
        }
      } else {
        await refetchList()
      }
    },
    [isControlled, refetchList],
  )

  const createProduct = useCallback(
    async (form) => {
      const created = await createMutation.mutateAsync(form)
      return mapItemToProduct(created)
    },
    [createMutation],
  )

  const updateProduct = useCallback(
    async (productId, form) => {
      const updated = await updateMutation.mutateAsync({ productId, form })
      return mapItemToProduct(updated)
    },
    [updateMutation],
  )

  const deleteProduct = useCallback(
    async (productId) => {
      await deleteMutation.mutateAsync(productId)
    },
    [deleteMutation],
  )

  const saving = createMutation.isPending || updateMutation.isPending
  const error =
    listQuery.error?.message ??
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    null

  const products = listQuery.data ?? []

  const loading = queryEnabled && listQuery.isFetching

  return {
    products,
    loading,
    saving,
    error,
    fetchProducts: fetchProductsWithRefetch,
    refetch: refetchList,
    createProduct,
    updateProduct,
    deleteProduct,
  }
}
