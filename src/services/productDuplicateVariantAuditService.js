// Read-only report: finds products (scoped to a set of stores) that have two or more variants
// sharing the exact same color/size/custom-option identity — the shape reported for "azzam store"
// and "جنيد للمعاطف": duplicate variants that differ only in stock. Nothing is written back.
import * as productService from './productService.js'
import * as storeService from './storeService.js'
import { mapStoreFromApi } from '../models/Store.js'
import { mapApiVariantToRow, normalizeVariantList, variantIdentityKey } from '../utils/productVariants.js'

const PRODUCT_PAGE_SIZE = 50

function normalizeProductPage(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.results)) return data.results
  return []
}

function normalizeProductTotal(data) {
  for (const value of [data?.count, data?.total, data?.total_products, data?.results_count]) {
    const total = Number(value)
    if (Number.isFinite(total) && total >= 0) return total
  }
  return null
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return
  throw new DOMException('Scan stopped', 'AbortError')
}

/** Case/whitespace-insensitive substring match — same tolerance the rest of this audit tooling uses. */
function storeNameMatches(storeName, query) {
  const name = String(storeName ?? '').trim().toLowerCase()
  const q = String(query ?? '').trim().toLowerCase()
  return q !== '' && name.includes(q)
}

async function resolveTargetStores(storeNameQueries, signal) {
  const raw = await storeService.listStores({ signal })
  const stores = (Array.isArray(raw) ? raw : []).map(mapStoreFromApi)
  const matched = []
  const unmatchedQueries = []
  for (const query of storeNameQueries) {
    const hits = stores.filter((store) => storeNameMatches(store.name, query))
    if (hits.length === 0) unmatchedQueries.push(query)
    for (const store of hits) {
      if (!matched.some((m) => m.id === store.id)) matched.push(store)
    }
  }
  return { matched, unmatchedQueries }
}

function initialProgress() {
  return {
    stores: [],
    unmatchedStoreQueries: [],
    currentStoreName: '',
    page: 1,
    totalProducts: null,
    scannedProducts: 0,
    failedProducts: 0,
    currentProductId: null,
    currentProductName: '',
    failures: [],
    duplicateMatches: [],
  }
}

/**
 * @param {string[]} storeNameQueries — case/whitespace-insensitive substrings to match store names
 *   against (e.g. `['azzam', 'جنيد للمعاطف']`). Every store whose name contains any query is scanned.
 * @param {{ signal?: AbortSignal, onProgress?: (progress: object) => void }} [options]
 */
export async function scanDuplicateVariants(storeNameQueries, { signal, onProgress } = {}) {
  const progress = initialProgress()
  const report = () =>
    onProgress?.({
      ...progress,
      stores: [...progress.stores],
      failures: [...progress.failures],
      duplicateMatches: [...progress.duplicateMatches],
    })

  const { matched, unmatchedQueries } = await resolveTargetStores(storeNameQueries, signal)
  progress.stores = matched
  progress.unmatchedStoreQueries = unmatchedQueries
  report()

  for (const store of matched) {
    throwIfAborted(signal)
    progress.currentStoreName = store.name
    progress.page = 1
    report()
    let page = 1
    let storeTotal = null

    while (true) {
      throwIfAborted(signal)
      const response = await productService.getProducts(
        { store_id: Number(store.id), page, page_size: PRODUCT_PAGE_SIZE },
        { signal },
      )
      const products = normalizeProductPage(response)
      const exactTotal = normalizeProductTotal(response)
      if (exactTotal != null) storeTotal = exactTotal
      if (products.length === 0) break

      for (const product of products) {
        throwIfAborted(signal)
        const productId = String(product?.id ?? '')
        progress.currentProductId = productId || null
        progress.currentProductName = String(product?.name ?? '')
        report()

        try {
          if (!productId) throw new Error('Product has no id')
          const variants = normalizeVariantList(
            await productService.listProductVariants(productId, { signal }),
          )
          const rows = variants.map((v) => mapApiVariantToRow(v, 'ar'))
          const groups = new Map()
          for (const row of rows) {
            const key = variantIdentityKey(row)
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(row)
          }
          for (const [, groupRows] of groups) {
            if (groupRows.length < 2) continue
            const [first] = groupRows
            progress.duplicateMatches.push({
              productId,
              name: String(product?.name ?? ''),
              storeId: store.id,
              storeName: store.name,
              isActive: product?.is_active ?? true,
              color: first.color,
              size: first.size,
              customOptionsLabel: (first.customAttributes || [])
                .map((a) => `${a.name}: ${a.value}`)
                .join(', '),
              variants: groupRows.map((row) => ({
                variantId: row.variantId,
                stockQuantity: row.stock_quantity,
                price: row.price,
                status: row.status,
                imageCount: Array.isArray(row.existingImages) ? row.existingImages.length : 0,
              })),
            })
          }
        } catch (err) {
          if (signal?.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError') throw err
          progress.failedProducts += 1
          progress.failures.push({
            productId,
            productName: progress.currentProductName,
            storeName: store.name,
            message: String(err?.message || 'Scan failed'),
          })
        } finally {
          progress.scannedProducts += 1
          report()
        }
      }

      if (
        products.length < PRODUCT_PAGE_SIZE ||
        (storeTotal != null && page * PRODUCT_PAGE_SIZE >= storeTotal)
      ) {
        break
      }
      page += 1
      progress.page = page
      report()
    }
  }

  progress.currentStoreName = ''
  progress.currentProductId = null
  progress.currentProductName = ''
  report()
  return progress
}

export function emptyDuplicateVariantAuditProgress() {
  return initialProgress()
}

/**
 * Direct, always-fresh duplicate check for a single product id — bypasses the store scope above
 * and any dashboard-side caching (it hits the API directly), so it's the fastest way to confirm
 * whether a specific product (e.g. one just cleaned up) still has duplicate variant rows.
 * @param {string | number} productId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array<object>>} same shape as `scanDuplicateVariants`'s `duplicateMatches`.
 */
export async function scanSingleProductForDuplicates(productId, { signal } = {}) {
  const pid = String(productId ?? '').trim()
  if (!pid) throw new Error('Product id is required')
  const [product, variants] = await Promise.all([
    productService.getProductById(pid).catch(() => null),
    productService.listProductVariants(pid, { signal }).then(normalizeVariantList),
  ])
  const rows = variants.map((v) => mapApiVariantToRow(v, 'ar'))
  const groups = new Map()
  for (const row of rows) {
    const key = variantIdentityKey(row)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const matches = []
  for (const [, groupRows] of groups) {
    if (groupRows.length < 2) continue
    const [first] = groupRows
    matches.push({
      productId: pid,
      name: String(product?.name ?? ''),
      storeId: product?.store_id ?? null,
      storeName: '',
      isActive: product?.is_active ?? true,
      color: first.color,
      size: first.size,
      customOptionsLabel: (first.customAttributes || [])
        .map((a) => `${a.name}: ${a.value}`)
        .join(', '),
      variants: groupRows.map((row) => ({
        variantId: row.variantId,
        stockQuantity: row.stock_quantity,
        price: row.price,
        status: row.status,
      })),
    })
  }
  return matches
}
