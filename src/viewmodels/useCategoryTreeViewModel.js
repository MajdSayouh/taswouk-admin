import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as categoryService from '../services/categoryService.js'
import { mapCategoryTree } from '../models/CategoryTree.js'
import { queryKeys } from '../query/queryKeys.js'

/**
 * One section's category tree and every management action on it.
 *
 * Each write carries `expected_scope` = this section, so a stale tab cannot
 * edit a category that has since moved to another section.
 *
 * @param {{ scope: 'store' | 'restaurant' | 'pharmacy' | 'mall' }} options
 */
export function useCategoryTreeViewModel({ scope }) {
  const queryClient = useQueryClient()
  // Under `categories` so every other category query refetches too (the
  // product pickers read the same tree).
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() })

  const treeQuery = useQuery({
    queryKey: [...queryKeys.categories.all(), 'tree', scope],
    queryFn: async ({ signal }) => mapCategoryTree(await categoryService.listCategoryTree({ scope, signal })),
  })

  const create = useMutation({
    mutationFn: (payload) => categoryService.createCategory({ ...payload, scope }),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }) =>
      categoryService.updateCategory(id, { ...payload, expected_scope: scope }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: ({ id, reassignTo }) =>
      categoryService.deleteCategoryWithOptions(id, { reassignTo, expectedScope: scope }),
    onSuccess: invalidate,
  })
  const moveProducts = useMutation({
    mutationFn: ({ id, targetId }) => categoryService.moveCategoryProducts(id, targetId),
    onSuccess: invalidate,
  })
  const reorder = useMutation({
    mutationFn: ({ parentId, orderedIds }) =>
      categoryService.reorderCategories({
        scope,
        parent_id: parentId == null ? null : Number(parentId),
        ordered_ids: orderedIds.map(Number),
      }),
    onSuccess: invalidate,
  })
  const changeScope = useMutation({
    mutationFn: ({ id, toScope, confirmName }) =>
      categoryService.changeCategoryScope(id, {
        scope: toScope,
        expected_scope: scope,
        confirm_name: confirmName,
      }),
    onSuccess: invalidate,
  })
  const uploadLogo = useMutation({
    mutationFn: ({ id, file }) => categoryService.uploadCategoryLogo(id, file),
    onSuccess: invalidate,
  })
  const deleteLogo = useMutation({
    mutationFn: (id) => categoryService.deleteCategoryLogo(id),
    onSuccess: invalidate,
  })

  // Read-only previews: no cache to invalidate. Stable, since the dialogs
  // re-run their preview whenever these change.
  const getImpact = useCallback((id) => categoryService.getCategoryImpact(id), [])
  const previewScopeChange = useCallback(
    (id, toScope) =>
      categoryService.changeCategoryScope(id, { scope: toScope, expected_scope: scope, dry_run: true }),
    [scope],
  )

  return {
    tree: treeQuery.data ?? [],
    loading: treeQuery.isFetching,
    error: treeQuery.error?.message ?? null,
    refetch: () => treeQuery.refetch(),
    create,
    update,
    remove,
    moveProducts,
    reorder,
    changeScope,
    uploadLogo,
    deleteLogo,
    getImpact,
    previewScopeChange,
  }
}
