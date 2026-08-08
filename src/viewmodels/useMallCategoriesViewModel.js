import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as mallCategoryService from '../services/mallCategoryService.js'
import { flattenMallCategoryTree } from '../models/MallCategory.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateAll(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.mallCategories.all() })
}

export function useMallCategoriesViewModel(options = {}) {
  const enabled = options.enabled !== false
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({
    queryKey: queryKeys.mallCategories.all(),
    enabled,
    queryFn: async ({ signal }) => {
      const rows = await mallCategoryService.listMallCategories({ signal })
      return flattenMallCategoryTree(rows)
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: mallCategoryService.createMallCategory,
    onSuccess: () => invalidateAll(queryClient),
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => mallCategoryService.updateMallCategory(id, payload),
    onSuccess: () => invalidateAll(queryClient),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => mallCategoryService.deleteMallCategory(id),
    onSuccess: () => invalidateAll(queryClient),
  })

  const createSubcategoryMutation = useMutation({
    mutationFn: mallCategoryService.createMallSubcategory,
    onSuccess: () => invalidateAll(queryClient),
  })

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => mallCategoryService.updateMallSubcategory(id, payload),
    onSuccess: () => invalidateAll(queryClient),
  })

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id) => mallCategoryService.deleteMallSubcategory(id),
    onSuccess: () => invalidateAll(queryClient),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (id) => mallCategoryService.toggleMallCategoryActive(id),
    onSuccess: () => invalidateAll(queryClient),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: ({ id, file }) => mallCategoryService.uploadMallCategoryLogo(id, file),
    onSuccess: () => invalidateAll(queryClient),
  })

  const deleteLogoMutation = useMutation({
    mutationFn: (id) => mallCategoryService.deleteMallCategoryLogo(id),
    onSuccess: () => invalidateAll(queryClient),
  })

  const moveCategoryMutation = useMutation({
    mutationFn: ({ id, newParentId }) => mallCategoryService.moveMallCategory(id, newParentId),
    onSuccess: () => invalidateAll(queryClient),
  })

  const categories = categoriesQuery.data?.categories ?? []
  const subcategories = categoriesQuery.data?.subcategories ?? []
  const loading = enabled && categoriesQuery.isFetching

  const error =
    categoriesQuery.error?.message ??
    createCategoryMutation.error?.message ??
    updateCategoryMutation.error?.message ??
    deleteCategoryMutation.error?.message ??
    createSubcategoryMutation.error?.message ??
    updateSubcategoryMutation.error?.message ??
    deleteSubcategoryMutation.error?.message ??
    toggleActiveMutation.error?.message ??
    uploadLogoMutation.error?.message ??
    deleteLogoMutation.error?.message ??
    moveCategoryMutation.error?.message ??
    null

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map()
    for (const sc of subcategories) {
      const key = String(sc.categoryId ?? '')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(sc)
    }
    return map
  }, [subcategories])

  const createCategory = useCallback(
    (payload) => createCategoryMutation.mutateAsync(payload),
    [createCategoryMutation],
  )
  const updateCategory = useCallback(
    (id, payload) => updateCategoryMutation.mutateAsync({ id, payload }),
    [updateCategoryMutation],
  )
  const deleteCategory = useCallback(
    (id) => deleteCategoryMutation.mutateAsync(id),
    [deleteCategoryMutation],
  )
  const createSubcategory = useCallback(
    (payload) => createSubcategoryMutation.mutateAsync(payload),
    [createSubcategoryMutation],
  )
  const updateSubcategory = useCallback(
    (id, payload) => updateSubcategoryMutation.mutateAsync({ id, payload }),
    [updateSubcategoryMutation],
  )
  const deleteSubcategory = useCallback(
    (id) => deleteSubcategoryMutation.mutateAsync(id),
    [deleteSubcategoryMutation],
  )
  const toggleActive = useCallback(
    (id) => toggleActiveMutation.mutateAsync(id),
    [toggleActiveMutation],
  )
  const uploadCategoryLogo = useCallback(
    (id, file) => uploadLogoMutation.mutateAsync({ id, file }),
    [uploadLogoMutation],
  )
  const deleteCategoryLogo = useCallback(
    (id) => deleteLogoMutation.mutateAsync(id),
    [deleteLogoMutation],
  )
  const moveCategory = useCallback(
    (id, newParentId) => moveCategoryMutation.mutateAsync({ id, newParentId }),
    [moveCategoryMutation],
  )

  const saving =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending ||
    createSubcategoryMutation.isPending ||
    updateSubcategoryMutation.isPending ||
    deleteSubcategoryMutation.isPending ||
    toggleActiveMutation.isPending ||
    uploadLogoMutation.isPending ||
    deleteLogoMutation.isPending ||
    moveCategoryMutation.isPending

  return {
    categories,
    subcategories,
    subcategoriesByCategory,
    loading,
    saving,
    error,
    refetch: async () => {
      await categoriesQuery.refetch()
    },
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    toggleActive,
    uploadCategoryLogo,
    deleteCategoryLogo,
    moveCategory,
    toggleActiveMutation,
    updateCategoryMutation,
    updateSubcategoryMutation,
    uploadLogoMutation,
    deleteLogoMutation,
    moveCategoryMutation,
  }
}
