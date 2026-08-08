/**
 * Product create/update API payloads — ProductCreateSchema / ProductUpdateSchema.
 * @see https://test.taswouk.com/api/docs#/Products/products_api_update_product
 *
 * The editor form keeps UI-only fields (`category`, `subCategory`, `categoryId`, …).
 * Only whitelisted keys below may be sent on POST/PUT /api/products/.
 */
import { isHtmlEmpty } from './htmlContent.js'

const ALLOWED_KEYS = [
  'store_id',
  'name',
  'category_id',
  'size',
  'colors',
  'description',
  'price',
  'is_offer',
  'new_price',
  'is_active',
]

/** Product-level pricing keys rejected when variants exist (ProductUpdateSchema). */
const PRODUCT_PRICING_KEYS = ['price', 'is_offer', 'new_price']

const FORBIDDEN_KEYS = [
  'category',
  'sub_category',
  'subCategory',
  'categoryId',
  'subCategoryId',
  'sub_category_id',
  'storeId',
  'imageFiles',
  'isOffer',
  'newPrice',
  'isActive',
  'sizes',
  'sizeStr',
  'colorsStr',
]

function commaToArray(s) {
  if (s == null || String(s).trim() === '') return []
  return String(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** @param {Record<string, unknown>} form */
function sizesFromForm(form) {
  if (Array.isArray(form.sizes)) return form.sizes.map((x) => String(x).trim()).filter(Boolean)
  return commaToArray(form.sizeStr ?? '')
}

/** @param {Record<string, unknown>} form */
function colorsFromForm(form) {
  if (Array.isArray(form.colors)) {
    return form.colors.map((c) => String(c).trim()).filter(Boolean)
  }
  return commaToArray(form.colorsStr ?? '')
}

/** @param {Record<string, unknown>} form */
export function categoryIdFromEditorForm(form) {
  const candidates = [
    form.subCategoryId,
    form.sub_category_id,
    form.categoryId,
    form.category_id,
  ]
  for (let i = 0; i < candidates.length; i++) {
    const raw = candidates[i]
    if (raw == null || String(raw).trim() === '') continue
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  if (form.category != null && String(form.category).trim() !== '') {
    const parsed = Number(form.category)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

function descriptionForPayload(description) {
  if (isHtmlEmpty(description)) return null
  return String(description).trim()
}

/**
 * @param {import('axios').InternalAxiosRequestConfig} config
 */
export function getProductWriteRequestPath(config) {
  const url = String(config.url || '')
  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).pathname.replace(/\/+$/, '') || '/'
    } catch {
      /* fall through */
    }
  }
  const base = String(config.baseURL || '')
    .replace(/\/+$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  const combined = base ? `${base}${path}` : path
  try {
    if (/^https?:\/\//i.test(combined)) {
      return new URL(combined).pathname.replace(/\/+$/, '') || '/'
    }
  } catch {
    /* fall through */
  }
  return combined.replace(/\/+$/, '') || '/'
}

/**
 * @param {string} path
 * @param {string} [method]
 */
export function isProductWriteRequest(path, method = 'get') {
  const normalized = String(path || '')
    .split('?')[0]
    .replace(/\/+$/, '')
  const verb = String(method || 'get').toLowerCase()
  if (verb === 'post' && (normalized === '/api/products' || normalized.endsWith('/api/products'))) {
    return true
  }
  if (verb !== 'put') return false
  const match = normalized.match(/\/api\/products\/([^/]+)$/)
  if (!match) return false
  const tail = match[1]
  if (tail === 'categories' || tail === 'files') return false
  return true
}

/**
 * @param {unknown} data
 * @returns {Record<string, unknown> | null}
 */
export function parseRequestDataAsObject(data) {
  if (data == null) return null
  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
    try {
      const parsed = JSON.parse(trimmed)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  if (typeof data === 'object' && !(data instanceof FormData)) {
    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) return null
    return /** @type {Record<string, unknown>} */ (data)
  }
  return null
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function sanitizeProductWritePayload(payload) {
  const src = payload && typeof payload === 'object' ? payload : {}
  /** @type {Record<string, unknown>} */
  const out = {}

  for (let i = 0; i < ALLOWED_KEYS.length; i++) {
    const key = ALLOWED_KEYS[i]
    if (src[key] !== undefined) out[key] = src[key]
  }

  if (out.category_id == null && src.category != null) {
    const numeric = Number(src.category)
    if (Number.isFinite(numeric) && numeric > 0) out.category_id = numeric
  }

  for (let i = 0; i < FORBIDDEN_KEYS.length; i++) {
    const key = FORBIDDEN_KEYS[i]
    if (key in out) delete out[key]
  }

  return out
}

/**
 * PUT bodies: omit null/undefined so the API only receives explicit changes.
 * (Some server builds still merge legacy `category` when null keys are present.)
 * @param {Record<string, unknown>} payload
 */
/**
 * When the API has variants, product-level price / offer fields must not be sent on PUT/POST.
 * @param {Record<string, unknown>} payload
 */
export function omitProductPricingWhenVariantsExist(payload) {
  for (let i = 0; i < PRODUCT_PRICING_KEYS.length; i++) {
    const key = PRODUCT_PRICING_KEYS[i]
    if (key in payload) delete payload[key]
  }
  return payload
}

/**
 * @param {Record<string, unknown>} payload
 */
export function omitNullishProductWriteFields(payload) {
  const out = /** @type {Record<string, unknown>} */ ({})
  for (const key of Object.keys(payload)) {
    const value = payload[key]
    if (value !== null && value !== undefined) out[key] = value
  }
  return out
}

/** @param {Record<string, unknown>} src */
export function logStrippedProductWriteFields(src) {
  if (!import.meta.env.DEV) return
  const stripped = FORBIDDEN_KEYS.filter((key) => key in src)
  if (stripped.length > 0) {
    console.warn(
      '[products] Removed UI-only fields from API payload (use category_id):',
      stripped.join(', '),
    )
  }
}

/**
 * @param {Record<string, unknown>} form
 * @param {{ hasVariants?: boolean }} [options] — omit product-level pricing when variants will be created
 */
export function buildProductCreatePayload(form, options = {}) {
  const size = sizesFromForm(form)
  const colors = colorsFromForm(form)
  const priceNum = form.price === '' ? 0 : Number(form.price)
  const newPrice =
    form.isOffer && form.newPrice !== '' && form.newPrice != null
      ? Number(form.newPrice)
      : null

  const raw = {
    store_id: Number(form.storeId),
    name: String(form.name).trim(),
    category_id: categoryIdFromEditorForm(form),
    size,
    colors,
    description: descriptionForPayload(form.description),
    price: Number.isFinite(priceNum) ? priceNum : 0,
    is_offer: Boolean(form.isOffer),
    new_price: newPrice,
    is_active: form.isActive !== false,
  }
  logStrippedProductWriteFields(form)
  let payload = sanitizeProductWritePayload(raw)
  if (options.hasVariants) {
    payload = omitProductPricingWhenVariantsExist(payload)
  }
  return payload
}

/**
 * @param {Record<string, unknown>} form
 * @param {{ baselineCategoryId?: number | string | null, hasVariants?: boolean }} [options]
 *   When `baselineCategoryId` matches the resolved form category, `category_id` is omitted
 *   to avoid a known API bug that injects legacy `category` when `category_id` is sent.
 *   When `hasVariants` is true, `price` / `is_offer` / `new_price` are omitted (variant pricing only).
 */
export function buildProductUpdatePayload(form, options = {}) {
  const size = sizesFromForm(form)
  const colors = colorsFromForm(form)
  const newPrice =
    form.isOffer && form.newPrice !== '' && form.newPrice != null
      ? Number(form.newPrice)
      : null
  const categoryId = categoryIdFromEditorForm(form)

  const raw = {
    name: form.name?.trim() || null,
    category_id: categoryId,
    size,
    colors,
    description: descriptionForPayload(form.description),
    price: form.price === '' || form.price == null ? null : Number(form.price),
    is_offer: form.isOffer != null ? Boolean(form.isOffer) : null,
    new_price: newPrice,
    is_active: form.isActive != null ? Boolean(form.isActive) : null,
  }
  logStrippedProductWriteFields(form)
  let payload = omitNullishProductWriteFields(sanitizeProductWritePayload(raw))

  const skipCategoryId =
    String(import.meta.env.VITE_PRODUCT_UPDATE_OMIT_CATEGORY_ID ?? '').toLowerCase() === 'true'
  const baselineRaw = options.baselineCategoryId
  const baseline =
    baselineRaw != null && String(baselineRaw).trim() !== '' ? Number(baselineRaw) : null
  const categoryUnchanged =
    baseline != null && Number.isFinite(baseline) && categoryId != null && categoryId === baseline

  if (skipCategoryId || categoryUnchanged) {
    delete payload.category_id
  }

  if (options.hasVariants) {
    payload = omitProductPricingWhenVariantsExist(payload)
  }

  return payload
}
