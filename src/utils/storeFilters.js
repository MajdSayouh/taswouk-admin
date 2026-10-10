export function filterStoresByType(stores, storeType) {
  if (!storeType) return stores
  return stores.filter((store) => store.storeType === storeType)
}
