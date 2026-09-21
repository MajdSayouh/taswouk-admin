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
 * @property {{ id: string, url: string, isFeatured: boolean }[]} productImages
 * @property {number | null} productCategoryId
 * @property {number} price
 * @property {boolean} isOffer
 * @property {number | null} comparePrice
 * @property {boolean} isAvailable
 * @property {boolean} isActive
 * @property {number} stockQuantity
 * @property {boolean} trackStock
 * @property {boolean} hasVariants
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
      productImages: [],
      productCategory: '',
      productCategoryId: null,
      price: 0,
      isOffer: false,
      comparePrice: null,
      isAvailable: false,
      isActive: true,
      stockQuantity: 0,
      trackStock: false,
      hasVariants: false,
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

  const images = Array.isArray(raw.product_images) ? raw.product_images : []
  const featured = images.find((img) => img?.is_featured) ?? images[0] ?? null

  return {
    id: String(raw.id ?? nested?.id ?? ''),
    // `product_id` mirrors `id` now that the shared catalogue is gone — both
    // name the mall's own product. Kept because the API still sends it.
    productId: String(raw.product_id ?? raw.id ?? nested?.id ?? ''),
    productName: raw.product_name ?? nested?.name ?? '',
    productDescription: raw.product_description ?? nested?.description ?? '',
    productImageUrl: featured?.image ?? raw.product_image_url ?? nested?.image_url ?? null,
    productImages: images.map((img) => ({
      id: String(img?.id ?? ''),
      url: img?.image ?? '',
      isFeatured: Boolean(img?.is_featured),
    })),
    productCategory:
      (raw.product_category && typeof raw.product_category === 'object'
        ? raw.product_category.name
        : raw.product_category) ??
      nested?.category_name ??
      nested?.category ??
      '',
    productCategoryId:
      raw.product_category && typeof raw.product_category === 'object'
        ? (raw.product_category.id ?? null)
        : null,
    price: Number(raw.price) || 0,
    // `price` above is the EFFECTIVE price — what the customer pays — so an
    // offer does not change it, it only adds the original beside it. Named
    // after the server's `compare_price` rather than the store side's
    // `new_price`, which means the opposite number.
    isOffer: Boolean(raw.is_offer),
    comparePrice:
      raw.compare_price == null ? null : Number(raw.compare_price) || null,
    isAvailable: Boolean(raw.is_available ?? raw.available),
    isActive: raw.is_active !== false,
    stockQuantity: Number(raw.stock_quantity) || 0,
    trackStock: Boolean(raw.track_stock),
    hasVariants: Boolean(raw.has_variants),
    createdAt: raw.created_at ?? '',
  }
}
