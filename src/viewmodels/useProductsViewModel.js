/**
 * Products ViewModel — list, create, update, delete via `productService` (TanStack Query).
 */
import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as productService from '../services/productService.js'
import {
  buildProductCreatePayload,
  buildProductUpdatePayload,
} from '../utils/productWritePayload.js'
import { fetchProductsList, mapProductListItem } from '../query/fetchers/productList.js'
import { queryKeys } from '../query/queryKeys.js'

export { buildProductCreatePayload, buildProductUpdatePayload } from '../utils/productWritePayload.js'

function invalidateProductQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.products.root })
}

/** @param {unknown} data */
function normalizeProductsQueryData(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.rows)) return data.rows
  return []
}

/** @param {unknown} data */
function normalizeProductsQueryTotal(data) {
  if (data && typeof data === 'object' && typeof data.total === 'number') return data.total
  if (Array.isArray(data)) return data.length
  return 0
}

function normalizeProductsQueryTotalIsExact(data) {
  return Boolean(data && typeof data === 'object' && data.totalIsExact)
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
    queryFn: ({ signal }) => fetchProductsList({ signal, params: listParams }),
    enabled: queryEnabled,
  })

  const createMutation = useMutation({
    mutationFn: async ({ form, hasVariants = false }) => {
      const payload = buildProductCreatePayload(form, { hasVariants })
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

  const setActiveMutation = useMutation({
    mutationFn: async ({ productId, isActive }) => {
      return productService.updateProduct(productId, { is_active: Boolean(isActive) })
    },
    onSuccess: (_, { productId }) => {
      invalidateProductQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) })
    },
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
    async (form, options = {}) => {
      const created = await createMutation.mutateAsync({
        form,
        hasVariants: Boolean(options.hasVariants),
      })
      return mapProductListItem(created)
    },
    [createMutation],
  )

  const updateProduct = useCallback(
    async (productId, form) => {
      const updated = await updateMutation.mutateAsync({ productId, form })
      return mapProductListItem(updated)
    },
    [updateMutation],
  )

  const deleteProduct = useCallback(
    async (productId) => {
      await deleteMutation.mutateAsync(productId)
    },
    [deleteMutation],
  )

  const setProductActive = useCallback(
    async (productId, isActive) => {
      await setActiveMutation.mutateAsync({ productId, isActive })
    },
    [setActiveMutation],
  )

  const saving =
    createMutation.isPending || updateMutation.isPending || setActiveMutation.isPending
  const error =
    listQuery.error?.message ??
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    setActiveMutation.error?.message ??
    null

  const products = normalizeProductsQueryData(listQuery.data)
  const total = normalizeProductsQueryTotal(listQuery.data)
  const totalIsExact = normalizeProductsQueryTotalIsExact(listQuery.data)

  const loading = queryEnabled && listQuery.isFetching

  return {
    products,
    total,
    totalIsExact,
    loading,
    saving,
    error,
    fetchProducts: fetchProductsWithRefetch,
    refetch: refetchList,
    createProduct,
    updateProduct,
    deleteProduct,
    setProductActive,
    setActiveMutation,
  }
}
