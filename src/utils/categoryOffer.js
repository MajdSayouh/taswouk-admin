/**
 * Category offer — the rule the dashboard sends to `POST /api/products/category-offer`.
 *
 * Only the rule travels: the category, the percentage and the scope. The
 * server collects the products and prices each from its own original price,
 * exactly as the bulk offer does, so validation (`parseBulkOfferValue`) and the
 * result shape (`normalizeBulkOfferResult`) are shared with `bulkOffer.js`.
 */

/**
 * @param {{ categoryId: number | string, action: 'apply' | 'remove', percent?: number, storeId?: number | string | null, includeSubcategories?: boolean }} input
 */
export function buildCategoryOfferPayload({ categoryId, action, percent, storeId, includeSubcategories = true }) {
  const payload = {
    category_id: Number(categoryId),
    action,
    include_subcategories: Boolean(includeSubcategories),
  }
  if (action === 'apply') payload.percent = percent
  const store = storeId == null || storeId === '' ? null : Number(storeId)
  if (Number.isInteger(store)) payload.store_id = store
  return payload
}
