/**
 * Mall catalog product — MallProductOutSchema / MallProductCreateSchema.
 * @see https://test.taswouk.com/api/docs#/Mall%20Products%20(Catalog)
 */

/**
 * @typedef {Object} MallCatalogProductRow
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string | null} imageUrl
 * @property {{ id: string, image: string, isFeatured: boolean }[]} images
 * @property {string} categoryId
 * @property {string} categoryName
 * @property {boolean} isActive
 * @property {string} createdAt
 */

/**
 * @param {unknown} raw
 * @returns {MallCatalogProductRow}
 */
export function mapMallCatalogProductFromApi(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      description: '',
      imageUrl: null,
      images: [],
      categoryId: '',
      categoryName: '',
      isActive: false,
      createdAt: '',
    }
  }
  const images = Array.isArray(raw.images)
    ? raw.images
        .map((img) => ({
          id: String(img?.id ?? ''),
          image: img?.image ?? '',
          isFeatured: Boolean(img?.is_featured),
        }))
        .filter((img) => img.id && img.image)
    : []
  const featured = images.find((img) => img.isFeatured) ?? images[0] ?? null
  const categoryObj = raw.category
  const categoryId =
    categoryObj && typeof categoryObj === 'object'
      ? String(categoryObj.id ?? '')
      : raw.category_id != null
        ? String(raw.category_id)
        : ''
  const categoryName =
    categoryObj && typeof categoryObj === 'object'
      ? String(categoryObj.name ?? '').trim()
      : typeof raw.category === 'string'
        ? raw.category
        : ''
  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? '',
    description: raw.description ?? '',
    imageUrl: featured?.image ?? raw.image_url ?? null,
    images,
    categoryId,
    categoryName,
    isActive: Boolean(raw.is_active),
    createdAt: raw.created_at ?? '',
  }
}

/**
 * @param {Record<string, unknown>} form
 */
export function buildMallCatalogCreatePayload(form) {
  const categoryId = form.category_id ?? form.categoryId
  return {
    name: String(form.name ?? '').trim(),
    description: String(form.description ?? '').trim() || '',
    category_id:
      categoryId != null && String(categoryId).trim() !== '' ? Number(categoryId) : null,
  }
}

/**
 * @param {Record<string, unknown>} form
 */
export function buildMallCatalogUpdatePayload(form) {
  /** @type {Record<string, unknown>} */
  const payload = {
    name: form.name != null ? String(form.name).trim() || null : null,
    description: form.description != null ? String(form.description).trim() || null : null,
    category_id:
      form.category_id != null || form.categoryId != null
        ? Number(form.category_id ?? form.categoryId) || null
        : null,
    is_active: form.is_active != null ? Boolean(form.is_active) : null,
  }
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const key of Object.keys(payload)) {
    if (payload[key] !== null && payload[key] !== undefined) out[key] = payload[key]
  }
  return out
}
