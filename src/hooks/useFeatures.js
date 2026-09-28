import { useQuery } from '@tanstack/react-query'
import { FEATURES_OFF, getFeatures } from '../services/featuresService.js'
import { queryKeys } from '../query/queryKeys.js'

/**
 * The backend's phase 4 switches (GET /api/features).
 *
 * `features` is all-false while loading and when the request fails, so a
 * caller can gate on it directly and gets today's behaviour until the backend
 * says otherwise. `loading` is there for the few callers (route redirects)
 * that must not act on the fallback before the real answer arrives.
 */
export function useFeatures() {
  const query = useQuery({
    queryKey: queryKeys.features.all(),
    queryFn: ({ signal }) => getFeatures({ signal }),
    // The switches are flipped by a deploy, not by anything done here.
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return {
    features: query.data ?? FEATURES_OFF,
    loading: query.isPending,
  }
}
