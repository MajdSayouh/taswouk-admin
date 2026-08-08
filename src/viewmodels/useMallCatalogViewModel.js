/**
 * Mall catalog products (admin) — list + CRUD.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as mallCatalogService from '../services/mallCatalogService.js'
import { mapMallCatalogProductFromApi } from '../models/MallCatalogProduct.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateCatalog(queryClient, productId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.mallCatalog.all() })
  if (productId != null && productId !== '') {
    queryClient.invalidateQueries({ queryKey: queryKeys.mallCatalog.detail(productId) })
  }
}

/**
 * @param {{ fetchOnMount?: boolean }} [options]
 */
export function useMallCatalogViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.mallCatalog.all(),
    queryFn: async ({ signal }) => {
      const { products } = await mallCatalogService.listMallCatalogProducts({ signal })
      return (Array.isArray(products) ? products : []).map(mapMallCatalogProductFromApi)
    },
    enabled: fetchOnMount,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => mallCatalogService.createMallCatalogProduct(payload),
    onSuccess: () => invalidateCatalog(queryClient),
  })

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }) =>
      mallCatalogService.updateMallCatalogProduct(productId, payload),
    onSuccess: (_, { productId }) => invalidateCatalog(queryClient, productId),
  })

  const deleteMutation = useMutation({
    mutationFn: (productId) => mallCatalogService.deleteMallCatalogProduct(productId),
    onSuccess: (_, productId) => invalidateCatalog(queryClient, productId),
  })

  const uploadImagesMutation = useMutation({
    mutationFn: ({ productId, files }) =>
      mallCatalogService.uploadMallCatalogProductImages(productId, files),
    onSuccess: (_, { productId }) => invalidateCatalog(queryClient, productId),
  })

  const setFeaturedImageMutation = useMutation({
    mutationFn: ({ productId, imageId }) =>
      mallCatalogService.setFeaturedMallCatalogProductImage(productId, imageId),
    onSuccess: (_, { productId }) => invalidateCatalog(queryClient, productId),
  })

  const deleteImageMutation = useMutation({
    mutationFn: ({ productId, imageId }) =>
      mallCatalogService.deleteMallCatalogProductImage(productId, imageId),
    onSuccess: (_, { productId }) => invalidateCatalog(queryClient, productId),
  })

  return {
    products: listQuery.data ?? [],
    loading: fetchOnMount && listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    uploadImagesMutation,
    setFeaturedImageMutation,
    deleteImageMutation,
  }
}
