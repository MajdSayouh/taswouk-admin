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
  return {
    id: String(raw.id ?? ''),
    productId: String(raw.product_id ?? ''),
    productName: raw.product_name ?? '',
    productDescription: raw.product_description ?? '',
    productImageUrl: raw.product_image_url ?? null,
    productCategory: raw.product_category ?? '',
    price: Number(raw.price) || 0,
    isAvailable: Boolean(raw.is_available),
    createdAt: raw.created_at ?? '',
  }
}
