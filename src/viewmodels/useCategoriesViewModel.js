import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as categoryService from '../services/categoryService.js'
import { flattenCategoryTree } from '../models/Category.js'
import { queryKeys } from '../query/queryKeys.js'

function invalidateAll(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.categories.subcategories() })
  queryClient.invalidateQueries({ queryKey: queryKeys.categories.combined() })
}

export function useCategoriesViewModel(options = {}) {
  const enabled = options.enabled !== false
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all(),
    enabled,
    queryFn: async ({ signal }) => {
      const rows = await categoryService.listCategories({ signal })
      return flattenCategoryTree(rows)
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => invalidateAll(queryClient),
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => categoryService.updateCategory(id, payload),
    onSuccess: () => invalidateAll(queryClient),
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => categoryService.deleteCategory(id),
    onSuccess: () => invalidateAll(queryClient),
  })

  const createSubcategoryMutation = useMutation({
    mutationFn: categoryService.createSubcategory,
    onSuccess: () => invalidateAll(queryClient),
  })

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => categoryService.updateSubcategory(id, payload),
    onSuccess: () => invalidateAll(queryClient),
  })

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id) => categoryService.deleteSubcategory(id),
    onSuccess: () => invalidateAll(queryClient),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: ({ id, file }) => categoryService.uploadCategoryLogo(id, file),
    onSuccess: () => invalidateAll(queryClient),
  })

  const deleteLogoMutation = useMutation({
    mutationFn: (id) => categoryService.deleteCategoryLogo(id),
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
    uploadLogoMutation.error?.message ??
    deleteLogoMutation.error?.message ??
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
  const uploadCategoryLogo = useCallback(
    (id, file) => uploadLogoMutation.mutateAsync({ id, file }),
    [uploadLogoMutation],
  )
  const deleteCategoryLogo = useCallback(
    (id) => deleteLogoMutation.mutateAsync(id),
    [deleteLogoMutation],
  )

  const saving =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending ||
    createSubcategoryMutation.isPending ||
    updateSubcategoryMutation.isPending ||
    deleteSubcategoryMutation.isPending ||
    uploadLogoMutation.isPending ||
    deleteLogoMutation.isPending

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
    uploadCategoryLogo,
    deleteCategoryLogo,
    updateCategoryMutation,
    updateSubcategoryMutation,
  }
}
