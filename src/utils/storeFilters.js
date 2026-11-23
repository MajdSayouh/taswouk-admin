export function filterStoresByType(stores, storeType) {
  if (!storeType) return stores
  return stores.filter((store) => store.storeType === storeType)
}

/**
 * Drops the rows whose `storeType` is one of `excludedTypes` — used by the
 * general stores page so restaurants and pharmacies, which have pages of their
 * own, are not listed there as well.
 *
 * @param {Array<{ storeType?: string | null }>} stores
 * @param {Iterable<string>} excludedTypes
 */
export function excludeStoreTypes(stores, excludedTypes) {
  const excluded = new Set(excludedTypes)
  if (excluded.size === 0) return stores
  return stores.filter((store) => !excluded.has(store.storeType || 'global'))
}
