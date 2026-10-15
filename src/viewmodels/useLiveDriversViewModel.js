/**
 * Live drivers map — polls GET /api/delivery/drivers/live every 10 s while the page is
 * visible (admin JWT).
 */
import { useQuery } from '@tanstack/react-query'
import * as deliveryTrackingService from '../services/deliveryTrackingService.js'
import { queryKeys } from '../query/queryKeys.js'
import { driverState, sortDrivers } from '../utils/liveDrivers.js'

export const LIVE_DRIVERS_POLL_MS = 10_000

export function useLiveDriversViewModel() {
  const query = useQuery({
    queryKey: queryKeys.drivers.live(),
    queryFn: ({ signal }) => deliveryTrackingService.getLiveDrivers({ signal }),
    refetchInterval: LIVE_DRIVERS_POLL_MS,
    refetchIntervalInBackground: false,
  })

  const drivers = sortDrivers(query.data ?? [])
  /** @type {Record<string, number>} */
  const counts = { onTheRoad: 0, assigned: 0, available: 0, stale: 0, noLocation: 0 }
  for (const d of drivers) counts[driverState(d)] += 1

  return {
    drivers,
    counts,
    // Only the first load spins; background polls must not blank the map.
    loading: query.isPending,
    error: query.error?.message ?? null,
    lastUpdatedAt: query.dataUpdatedAt || null,
    refetch: query.refetch,
  }
}
