/**
 * Mall product assignment — MollProductOutSchema.
 */

/**
 * @typedef {Object} MallProductAssignmentRow
 * @property {string} id
 * @property {string} productId
 * @property {string} productName
 * @property {string} productDescription
 * @property {string | null} productImageUrl
 * @property {string} productCategory
 * @property {number} price
 * @property {boolean} isAvailable
 * @property {string} createdAt
 */

/**
 * @param {unknown} raw
 * @returns {MallProductAssignmentRow}
 */
export function mapMallProductAssignmentFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      productId: '',
      productName: '',
      productDescription: '',
      productImageUrl: null,
      productCategory: '',
      price: 0,
      isAvailable: false,
      createdAt: '',
    }
  }
  // Some responses nest the catalog product under `product`/`moll_product` instead of
  // flattening it as `product_name`/`product_id` — fall back to that shape too.
  const nested =
    raw.product && typeof raw.product === 'object'
      ? raw.product
      : raw.moll_product && typeof raw.moll_product === 'object'
        ? raw.moll_product
        : null

  return {
    id: String(raw.id ?? nested?.id ?? ''),
    productId: String(raw.product_id ?? nested?.id ?? raw.moll_product_id ?? ''),
    productName: raw.product_name ?? nested?.name ?? '',
    productDescription: raw.product_description ?? nested?.description ?? '',
    productImageUrl: raw.product_image_url ?? nested?.image_url ?? null,
    productCategory:
      (raw.product_category && typeof raw.product_category === 'object'
        ? raw.product_category.name
        : raw.product_category) ??
      nested?.category_name ??
      nested?.category ??
      '',
    price: Number(raw.price) || 0,
    isAvailable: Boolean(raw.is_available ?? raw.available),
    createdAt: raw.created_at ?? '',
  }
}
