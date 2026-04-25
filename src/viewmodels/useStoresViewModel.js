/**
 * Stores ViewModel — Phase 1: list only (create via admin; edit via store PUT).
 */
import { useQuery } from '@tanstack/react-query'
import * as storeService from '../services/storeService.js'
import { mapStoreFromApi } from '../models/Store.js'
import { queryKeys } from '../query/queryKeys.js'

export function useStoresViewModel(options = {}) {
  const fetchOnMount = options.fetchOnMount !== false

  const query = useQuery({
    queryKey: queryKeys.stores.all(),
    queryFn: async () => {
      const list = await storeService.listStores()
      return Array.isArray(list) ? list.map(mapStoreFromApi) : []
    },
    enabled: fetchOnMount,
  })

  return {
    stores: query.data ?? [],
    loading: fetchOnMount && query.isFetching,
    error: query.error?.message ?? null,
    fetchStores: query.refetch,
  }
}
