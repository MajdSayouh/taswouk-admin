/** Helpers for product variant rows ↔ API (attributes color / optional size). */
import { extractProductImageStoragePath } from './mediaUrl.js'

export const VARIANT_STATUS_VALUES = ['active', 'inactive', 'out_of_stock']
export const STANDARD_VARIANT_VALUE = 'ستاندر'

/** Legacy placeholder values must not become selectable attributes in the customer app. */
export function isStandardVariantValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'standard' || normalized === STANDARD_VARIANT_VALUE.toLowerCase()
}

/** i18n key per `validateCustomAttributes` error code, for `t(OPTION_ERROR_MESSAGE_KEYS[code])`. */
export const OPTION_ERROR_MESSAGE_KEYS = {
  invalidKey: 'products.variants.optionInvalidKey',
  duplicateKey: 'products.variants.optionDuplicateKey',
  missingValue: 'products.variants.optionMissingValue',
}

function normalizeVariantImagePath(raw) {
  if (raw == null || raw === '') return ''
  const s = String(raw).trim()
  const ex = extractProductImageStoragePath(s)
  return (ex || s).replace(/^\/+/, '')
}

/** Same idea as `extractImagePathsFromProductDto`: strings or objects with `image` / `url` / `path`. */
function pathFromVariantImageItem(item) {
  if (item == null) return ''
  if (typeof item === 'string') return normalizeVariantImagePath(item)
  if (typeof item === 'object') {
    const raw = item.image ?? item.url ?? item.path
    if (raw != null) return normalizeVariantImagePath(raw)
  }
  return ''
}

/** The image's own id — needed to target DELETE .../variants/{id}/images/{image_id}; a bare
 * string path (no id available) can't be deleted individually via the dedicated endpoint. */
function idFromVariantImageItem(item) {
  if (item == null || typeof item !== 'object') return null
  return item.id ?? null
}

export function normalizeVariantList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  if (data && Array.isArray(data.variants)) return data.variants
  return []
}

/** Lowest `price` among a product's variants, or null when there are none priced. */
export function getMinVariantPrice(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return null
  const prices = variants
    .map((v) => Number(v?.price))
    .filter((p) => Number.isFinite(p) && p > 0)
  if (prices.length === 0) return null
  return Math.min(...prices)
}

/** First non-blank value — API sends `value_ar`/`attribute_key_ar` as `""` (not null) when unset, so `??` alone keeps the blank. */
export function firstNonEmpty(...values) {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') return s
  }
  return ''
}

export function attrByKey(attrs, key) {
  if (!Array.isArray(attrs)) return ''
  const normalizedKey = String(key ?? '').trim().toLowerCase()
  const hit = attrs.find(
    (a) => String(a?.attribute_key ?? a?.key ?? '').trim().toLowerCase() === normalizedKey,
  )
  // The mobile app uses value_en for selection and resolve-variant. Keep that canonical value
  // inside the dashboard too, otherwise editing an Arabic UI response can overwrite value_en.
  return firstNonEmpty(hit?.value_en, hit?.value, hit?.value_ar)
}

/** Fixed attribute keys handled by their own `color`/`size` fields — everything else is a custom option. */
const FIXED_ATTRIBUTE_KEYS = new Set(['color', 'size'])

/**
 * Backend `VariantAttribute.attribute_key` constraint: must start with a letter (any language —
 * the backend now accepts Arabic keys, not just ASCII), followed by letters, digits, or underscore.
 * No spaces/colons/commas — those are the delimiters in the `attr=key:value,key2:value2` query format.
 */
export const CUSTOM_ATTRIBUTE_KEY_PATTERN = /^[\p{L}][\p{L}\p{N}_]*$/u

/**
 * Common option names with Arabic/English labels, offered as quick picks. Picking one still maps
 * both languages to the same canonical key (rather than the raw Arabic label) so that filtering by
 * this attribute (`attr=weight:...`) stays consistent across products regardless of which language
 * the seller typed in — freeform Arabic (or any language) names are also accepted for anything not
 * in this list, since the backend now stores non-ASCII keys directly.
 */
export const CUSTOM_ATTRIBUTE_PRESETS = [
  { key: 'weight', ar: 'الوزن', en: 'Weight' },
  { key: 'material', ar: 'الخامة', en: 'Material' },
  { key: 'fabric', ar: 'القماش', en: 'Fabric' },
  { key: 'style', ar: 'الطراز', en: 'Style' },
  { key: 'scent', ar: 'الرائحة', en: 'Scent' },
  { key: 'volume', ar: 'الحجم', en: 'Volume' },
  { key: 'capacity', ar: 'السعة', en: 'Capacity' },
  { key: 'dimensions', ar: 'الأبعاد', en: 'Dimensions' },
  { key: 'brand', ar: 'العلامة التجارية', en: 'Brand' },
]

/** Localized label for a preset's technical `key`, or the raw key when it isn't a known preset. */
export function labelForCustomAttributeKey(key, lang = 'ar') {
  const preset = CUSTOM_ATTRIBUTE_PRESETS.find((p) => p.key === key)
  if (!preset) return key
  return lang === 'ar' ? preset.ar : preset.en
}

/**
 * Resolve a user-typed option name to the `attribute_key` the API stores: a preset's Arabic/English
 * label resolves to that preset's canonical key; anything else that satisfies the backend's key
 * format (starts with a letter, then letters/digits/underscore — Arabic or English) is used as-is.
 * Returns '' when it matches neither (e.g. contains spaces, digits-first, or punctuation).
 */
export function resolveCustomAttributeKey(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''
  const preset = CUSTOM_ATTRIBUTE_PRESETS.find(
    (p) => p.key === raw.toLowerCase() || p.ar === raw || p.en.toLowerCase() === raw.toLowerCase(),
  )
  if (preset) return preset.key
  return CUSTOM_ATTRIBUTE_KEY_PATTERN.test(raw) ? raw.toLowerCase() : ''
}

export function makeCustomAttributeRowKey() {
  return `ca_${Math.random().toString(36).slice(2, 11)}`
}

export function emptyCustomAttribute() {
  return { key: makeCustomAttributeRowKey(), name: '', value: '' }
}

/**
 * @param {Record<string, unknown>[] | undefined} attrs — API variant `attributes`
 * @param {string} [lang] — current UI language, for showing a preset's Arabic/English label
 */
export function customAttributesFromApi(attrs, lang = 'ar') {
  if (!Array.isArray(attrs)) return []
  return attrs
    .filter((a) => !FIXED_ATTRIBUTE_KEYS.has(String(a?.attribute_key ?? a?.key ?? '')))
    .map((a) => {
      const key = String(a?.attribute_key ?? a?.key ?? '')
      return {
        key: makeCustomAttributeRowKey(),
        name: labelForCustomAttributeKey(key, lang),
        value: firstNonEmpty(a?.value_en, a?.value, a?.value_ar),
      }
    })
}

/**
 * @param {{ name: string, value: string }[]} customAttributes
 * @returns {string | null} — error code: 'invalidKey' | 'duplicateKey' | 'missingValue' | null when valid
 */
export function validateCustomAttributes(customAttributes) {
  if (!Array.isArray(customAttributes)) return null
  const seen = new Set()
  for (const attr of customAttributes) {
    const name = String(attr?.name ?? '').trim()
    const value = String(attr?.value ?? '').trim()
    if (!name && !value) continue
    const resolvedKey = resolveCustomAttributeKey(name)
    if (!resolvedKey) return 'invalidKey'
    if (!value) return 'missingValue'
    if (seen.has(resolvedKey)) return 'duplicateKey'
    seen.add(resolvedKey)
  }
  return null
}

export function makeVariantRowKey() {
  return `vr_${Math.random().toString(36).slice(2, 11)}`
}

/** Resolve numeric variant id from API shapes (`id`, `variant_id`, `pk`). */
export function parseVariantIdFromDto(v) {
  if (v == null || typeof v !== 'object') return null
  const raw = v.id ?? v.variant_id ?? v.pk
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** API `compare_price` — promotional “new” price when `is_offer` is true (same idea as product offer price). */
export function variantComparePriceForApi(row) {
  if (!row?.is_offer) return null
  const v = Number(row?.compare_price)
  if (!Number.isFinite(v) || v <= 0) return null
  return v
}

/** True when row has offer on but no valid promotional price (`compare_price`). */
export function isVariantOfferPriceMissing(row) {
  if (!row?.is_offer) return false
  return variantComparePriceForApi(row) == null
}

/** Normalized `status` for PATCH (`active` | `inactive` | `out_of_stock`). */
export function variantStatusForApiRow(row) {
  const st = String(row?.status ?? 'active')
  return VARIANT_STATUS_VALUES.includes(st) ? st : 'active'
}

/** True when the row will be saved as an active variant. */
export function isActiveVariantRow(row) {
  return variantStatusForApiRow(row) === 'active'
}

/** Non-negative integer `stock_quantity` for the API, or `null` when left blank/invalid. */
export function variantStockQuantityForApi(row) {
  if (row?.stock_quantity == null || row.stock_quantity === '') return null
  const n = Number(row.stock_quantity)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

export function emptyVariantRow() {
  return {
    key: makeVariantRowKey(),
    variantId: null,
    /** From GET variant `product_id` — used to validate DELETE targets the right product */
    productId: null,
    color: '',
    size: '',
    /** @type {{ key: string, name: string, value: string }[]} arbitrary options beyond color/size, e.g. weight, material */
    customAttributes: [],
    price: '',
    compare_price: '',
    sku: '',
    stock_quantity: '',
    is_offer: false,
    status: 'active',
    /** @type {{ id: number | string, path: string }[]} images already saved on the variant (API
     * `images`) — `id` targets DELETE .../variants/{id}/images/{image_id} */
    existingImages: [],
    /** @type {File[]} new files — uploaded via the dedicated per-variant images endpoint once the
     * variant exists (create: right after the variant is created; edit: right after update) */
    imageFiles: [],
  }
}

/**
 * @param {Record<string, unknown>} v — API variant object
 * @param {string} [lang] — current UI language, for showing custom-option presets in Arabic/English
 */
export function mapApiVariantToRow(v, lang = 'ar') {
  const attrs = v?.attributes
  const color = attrByKey(attrs, 'color')
  const size = attrByKey(attrs, 'size')
  const st = String(v?.status ?? 'active')
  const imgs = Array.isArray(v?.images)
    ? v.images
        .map((item) => ({ id: idFromVariantImageItem(item), path: pathFromVariantImageItem(item) }))
        .filter((img) => img.path)
    : []
  const vid = parseVariantIdFromDto(v)
  const pid =
    v?.product_id != null && v?.product_id !== ''
      ? Number(v.product_id)
      : null

  return {
    key: makeVariantRowKey(),
    variantId: vid,
    productId: Number.isFinite(pid) && pid > 0 ? pid : null,
    color,
    size,
    customAttributes: customAttributesFromApi(attrs, lang),
    price: v?.price != null ? String(v.price) : '',
    compare_price: v?.compare_price != null ? String(v.compare_price) : '',
    sku: v?.sku != null ? String(v.sku) : '',
    stock_quantity: v?.stock_quantity != null ? String(v.stock_quantity) : '',
    is_offer: Boolean(v?.is_offer),
    status: VARIANT_STATUS_VALUES.includes(st) ? st : 'active',
    hasLegacyStandardAttribute: Array.isArray(attrs)
      ? attrs.some(
          (attribute) =>
            FIXED_ATTRIBUTE_KEYS.has(
              String(attribute?.attribute_key ?? attribute?.key ?? '').trim().toLowerCase(),
            ) &&
            isStandardVariantValue(
              firstNonEmpty(attribute?.value_en, attribute?.value, attribute?.value_ar),
            ),
        )
      : false,
    existingImages: imgs,
    imageFiles: [],
  }
}

export function variantComboKey(color, size) {
  return `${String(color ?? '').trim().toLowerCase()}|${String(size ?? '').trim().toLowerCase()}`
}

/**
 * Full identity of a row's attribute set (color + size + resolved custom options), for duplicate
 * detection — plain color/size combo alone isn't enough once both can be blank and rows are
 * distinguished only by their custom options (e.g. two color-less rows with different `material`).
 * @param {typeof emptyVariantRow()} row
 */
export function variantIdentityKey(row) {
  const base = variantComboKey(row.color, row.size)
  const custom = (Array.isArray(row.customAttributes) ? row.customAttributes : [])
    .map((attr) => {
      const key = resolveCustomAttributeKey(attr?.name)
      const value = String(attr?.value ?? '').trim().toLowerCase()
      return key && value ? `${key}:${value}` : ''
    })
    .filter(Boolean)
    .sort()
    .join(',')
  return `${base}|${custom}`
}

/**
 * @param {typeof emptyVariantRow()} row
 */
export function buildVariantAttributes(row) {
  const color = String(row.color ?? '').trim()
  const size = String(row.size ?? '').trim()
  const attributes = []
  if (color && !isStandardVariantValue(color)) {
    attributes.push({ key: 'color', value_en: color, sort_order: 0 })
  }
  if (size && !isStandardVariantValue(size)) {
    attributes.push({ key: 'size', value_en: size, sort_order: attributes.length })
  }

  let sortOrder = attributes.length
  const seen = new Set(attributes.map((a) => a.key))
  for (const attr of Array.isArray(row.customAttributes) ? row.customAttributes : []) {
    const resolvedKey = resolveCustomAttributeKey(attr?.name)
    const value = String(attr?.value ?? '').trim()
    if (!resolvedKey || !value || seen.has(resolvedKey)) continue
    seen.add(resolvedKey)
    attributes.push({ key: resolvedKey, value_en: value, sort_order: sortOrder })
    sortOrder += 1
  }
  return attributes
}

/**
 * Images are never part of this JSON body — per the backend's variant-system doc, variant images
 * are managed exclusively through the dedicated multipart endpoint
 * (`POST/DELETE .../variants/{id}/images` and `.../images/{image_id}`, see productService.js). Sending an
 * `images` array here was silently ignored by the backend (not part of its schema) and was the
 * actual cause of newly attached variant images not persisting.
 *
 * @param {typeof emptyVariantRow()} row
 */
export function buildVariantCreatePayload(row) {
  const price = Number(row.price)

  /** @type {Record<string, unknown>} */
  const payload = {
    price,
    compare_price: variantComparePriceForApi(row),
    sku: String(row.sku ?? '').trim() || null,
    is_offer: Boolean(row.is_offer),
    attributes: buildVariantAttributes(row),
  }
  // Backend defaults an omitted stock_quantity to 0, which can make the new variant out of stock.
  // A blank stock must therefore never reach the create endpoint as 0/omitted: default to 1.
  const stockQuantity = variantStockQuantityForApi(row)
  payload.stock_quantity = stockQuantity != null ? stockQuantity : 1
  return payload
}

/**
 * Images are never part of this JSON body — see buildVariantCreatePayload's note.
 * @param {typeof emptyVariantRow()} row
 */
export function buildVariantUpdatePayload(row) {
  const price = Number(row.price)
  const attributes = buildVariantAttributes(row)
  /** @type {Record<string, unknown>} */
  const payload = {
    price,
    compare_price: variantComparePriceForApi(row),
    sku: String(row.sku ?? '').trim() || null,
    is_offer: Boolean(row.is_offer),
    status: variantStatusForApiRow(row),
  }
  // The API validates an explicitly supplied attribute list as non-empty. Omitting the field
  // preserves an existing standard variant's legacy attributes while allowing its price/status
  // to be edited. Real color/size/custom-option variants still send their attributes normally.
  if (attributes.length > 0) payload.attributes = attributes
  const stockQuantity = variantStockQuantityForApi(row)
  if (stockQuantity != null) payload.stock_quantity = stockQuantity
  return payload
}

/** True when a row has any identifying content (color, size, or a custom option with name+value). */
function variantRowHasContent(row) {
  const color = String(row?.color ?? '').trim()
  const size = String(row?.size ?? '').trim()
  if (color || size) return true
  const customAttrs = Array.isArray(row?.customAttributes) ? row.customAttributes : []
  return customAttrs.some((a) => String(a?.name ?? '').trim() && String(a?.value ?? '').trim())
}

/**
 * Generate every real color/size combination selected on the product form. A missing axis is
 * omitted from the variant attributes because the mobile app renders every received attribute as
 * a required selector. Legacy `standard` / `ستاندر` placeholders are removed and, where possible,
 * their existing rows are reused for the real product combinations.
 *
 * @param {ReturnType<typeof emptyVariantRow>[]} rows
 * @param {unknown[]} [productColors]
 * @param {unknown[]} [productSizes]
 */
export function withStandardVariantAttributes(rows, productColors = [], productSizes = []) {
  const source = (Array.isArray(rows) ? rows : []).filter((row) => {
    const price = Number(row?.price)
    return row?.variantId != null || variantRowHasContent(row) || (Number.isFinite(price) && price > 0)
  })

  function normalizeVariantOption(value) {
    const option = String(value ?? '').trim()
    return !option || isStandardVariantValue(option) ? '' : option
  }

  const standardized = source.map((row) => ({
    ...row,
    color: normalizeVariantOption(row?.color),
    size: normalizeVariantOption(row?.size),
    hasLegacyStandardAttribute:
      Boolean(row?.hasLegacyStandardAttribute) ||
      isStandardVariantValue(row?.color) ||
      isStandardVariantValue(row?.size),
  }))

  function uniqueOptions(values) {
    const seen = new Set()
    const out = []
    for (const value of Array.isArray(values) ? values : []) {
      const option = normalizeVariantOption(value)
      const key = option.toLowerCase()
      if (!option || seen.has(key)) continue
      seen.add(key)
      out.push(option)
    }
    return out
  }

  const colors = uniqueOptions(productColors)
  const sizes = uniqueOptions(productSizes)
  if (colors.length === 0 && sizes.length === 0) return standardized

  const colorAxis = colors.length > 0 ? colors : ['']
  const sizeAxis = sizes.length > 0 ? sizes : ['']
  const existingCombos = new Set(
    standardized.map((row) => variantComboKey(row.color, row.size)),
  )
  const completed = [...standardized]
  for (const color of colorAxis) {
    for (const size of sizeAxis) {
      const combo = variantComboKey(color, size)
      if (existingCombos.has(combo)) continue
      existingCombos.add(combo)
      const reusableIndex = completed.findIndex(
        (row) =>
          row.hasLegacyStandardAttribute &&
          !row.color &&
          !row.size &&
          !(Array.isArray(row.customAttributes) && row.customAttributes.length > 0),
      )
      if (reusableIndex >= 0) {
        completed[reusableIndex] = {
          ...completed[reusableIndex],
          color,
          size,
          hasLegacyStandardAttribute: false,
        }
      } else {
        completed.push({ ...emptyVariantRow(), color, size })
      }
    }
  }
  return completed
}

/**
 * Rows with content (color/size/custom option) but no valid price — a price is still required by
 * the API per variant, so these need either a manual price or `withDefaultedVariantPrices` before
 * save. Used to surface a clear "enter a price" error instead of silently dropping the row.
 * @param {ReturnType<typeof emptyVariantRow>[]} rows
 */
export function getIncompleteVariantRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const price = Number(row?.price)
    return variantRowHasContent(row) && (!Number.isFinite(price) || price <= 0)
  })
}

/**
 * Rows with content but a blank/invalid price inherit the product's own price — so a variant
 * distinguished only by a custom option (e.g. "material: cotton") doesn't force re-typing the
 * price when the product already has one.
 * @param {ReturnType<typeof emptyVariantRow>[]} rows
 * @param {number | string} basePrice
 */
export function withDefaultedVariantPrices(rows, basePrice) {
  const base = Number(basePrice)
  if (!Number.isFinite(base) || base <= 0) return rows
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const price = Number(row?.price)
    if (Number.isFinite(price) && price > 0) return row
    if (!variantRowHasContent(row)) return row
    return { ...row, price: String(base) }
  })
}

/**
 * Rows user intends to save. Color, size, SKU, and custom options are all optional — the only
 * requirement is a valid price, so a row with just an option/value (no color) still saves.
 * @param {ReturnType<typeof emptyVariantRow>[]} rows
 */
export function getValidVariantRowsForSave(rows) {
  const out = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const price = Number(row.price)
    if (!Number.isFinite(price) || price <= 0) continue
    out.push(row)
  }
  return out
}

/**
 * @param {ReturnType<typeof emptyVariantRow>[]} validRows
 * @returns {string | null} error code
 */
export function findDuplicateVariantCombo(validRows) {
  const seen = new Set()
  for (let i = 0; i < validRows.length; i++) {
    const k = variantIdentityKey(validRows[i])
    if (seen.has(k)) return k
    seen.add(k)
  }
  return null
}
