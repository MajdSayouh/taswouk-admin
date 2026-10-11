/**
 * Store types with a sidebar tab of their own. Each one reuses the stores
 * list/create/edit pages, scoped to its `store_type`, under its own path and
 * with its own wording (an i18n block shaped like `restaurants`).
 *
 * @typedef {{
 *   storeType: string | null
 *   path: string
 *   i18n: string
 *   newKey: string
 *   backKey: string
 *   showsHours: boolean
 *   showsPreparation: boolean
 * }} StoreSection
 */

/** @type {StoreSection} */
const STORES_SECTION = {
  storeType: null,
  path: '/stores',
  i18n: 'stores',
  newKey: 'stores.list.newStore',
  backKey: 'stores.edit.backStores',
  showsHours: false,
  showsPreparation: false,
}

/** @type {Record<string, StoreSection>} */
export const STORE_SECTIONS = {
  restaurant: {
    storeType: 'restaurant',
    path: '/restaurants',
    i18n: 'restaurants',
    newKey: 'restaurants.list.newRestaurant',
    backKey: 'restaurants.edit.back',
    showsHours: true,
    showsPreparation: true,
  },
  // Duty hours matter for a pharmacy; a preparation time does not.
  pharmacy: {
    storeType: 'pharmacy',
    path: '/pharmacies',
    i18n: 'pharmacies',
    newKey: 'pharmacies.list.newPharmacy',
    backKey: 'pharmacies.edit.back',
    showsHours: true,
    showsPreparation: false,
  },
}

/**
 * @param {string | null | undefined} storeType — the page's `section` prop
 * @returns {StoreSection}
 */
export function storeSection(storeType) {
  return (storeType && STORE_SECTIONS[storeType]) || STORES_SECTION
}
