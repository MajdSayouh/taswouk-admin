import * as productService from '../../services/productService.js'
import { createProduct as toProductModel } from '../../models/Product.js'

function formatCategoryLabel(item) {
  const parts = [item.category, item.sub_category].filter(
    (x) => x != null && String(x).trim() !== '',
  )
  if (parts.length) return parts.join(' · ')
  const desc = item.description
  if (desc != null && String(desc).trim()) return String(desc).slice(0, 48)
  return '—'
}

function normalizeProductList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.products)) return data.products
  if (data && Array.isArray(data.results)) return data.results
  if (data && Array.isArray(data.items)) return data.items
  return []
}

function normalizeProductTotal(data) {
  if (typeof data?.total_products === 'number') return data.total_products
  if (typeof data?.count === 'number') return data.count
  if (typeof data?.total === 'number') return data.total
  if (typeof data?.results_count === 'number') return data.results_count
  return null
}

export function mapProductListItem(item) {
  const storeId = item.store_id
  const effectivePrice = item.display_price ?? item.price
  const colors = Array.isArray(item.colors)
    ? item.colors.map((color) => String(color ?? '').trim()).filter(Boolean)
    : []
  return {
    ...toProductModel({
      id: String(item.id ?? ''),
      name: item.name ?? '',
      sku: item.id != null ? `PRD-${item.id}` : '',
      category: formatCategoryLabel(item),
      // Public list responses already calculate the effective product/variant price. Using it
      // prevents the products table from issuing one variants request for every visible row.
      price: effectivePrice,
      stock: 0,
      isActive: item.is_active ?? true,
    }),
    storeId: storeId != null ? String(storeId) : '',
    description: item.description != null ? String(item.description) : '',
    isOffer: Boolean(item.is_offer),
    newPrice: item.new_price != null ? Number(item.new_price) : null,
    basePrice: item.price != null ? Number(item.price) : null,
    imageUrl: productService.pickProductCoverImagePath(item),
    colors,
    hasColors: colors.length > 0,
  }
}

/** Shared GET /api/products/ list fetch — one cache entry for dashboard + products page. */
export async function fetchProductsList({ signal, params = {} } = {}) {
  const q =
    Object.keys(params).length > 0
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      : undefined
  const raw =
    q?.q != null && String(q.q).trim() !== ''
      ? await productService.searchPublicProducts(
          /** @type {{ q: string }} */ (q),
          { signal },
        )
      : q?.page != null || q?.page_size != null
        ? await productService.getPublicProducts(q, { signal })
        : await productService.getProducts(q, { signal })
  const items = normalizeProductList(raw)
  const rows = items.map(mapProductListItem)
  const exactTotal = normalizeProductTotal(raw)
  const page = Math.max(1, Number(q?.page) || 1)
  const pageSize = Math.max(1, Number(q?.page_size) || rows.length || 1)
  const hasNextPage = rows.length === pageSize
  const inferredTotal = (page - 1) * pageSize + rows.length + (hasNextPage ? 1 : 0)
  return {
    rows,
    total: exactTotal ?? inferredTotal,
    totalIsExact: exactTotal != null || !hasNextPage,
    hasNextPage,
  }
}
