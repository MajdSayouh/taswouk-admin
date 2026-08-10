import * as productService from './productService.js'
import {
  buildVariantCreatePayload,
  buildVariantUpdatePayload,
  getValidVariantRowsForSave,
  mapApiVariantToRow,
  normalizeVariantList,
  withDefaultedVariantPrices,
  withStandardVariantAttributes,
} from '../utils/productVariants.js'

const MIGRATION_PAGE_SIZE = 50
const PENDING_STORAGE_KEY = 'taswouk:pending-product-variant-migration:v1'

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

function loadPendingProductIds() {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(PENDING_STORAGE_KEY) || '[]')
    return new Set(Array.isArray(stored) ? stored.map(String) : [])
  } catch {
    return new Set()
  }
}

function savePendingProductIds(ids) {
  try {
    globalThis.localStorage?.setItem(PENDING_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // The migration still works for this session when storage is unavailable.
  }
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return
  throw new DOMException('Migration stopped', 'AbortError')
}

function initialProgress() {
  return {
    page: 1,
    totalProducts: null,
    scannedProducts: 0,
    migratedProducts: 0,
    skippedProducts: 0,
    failedProducts: 0,
    createdVariants: 0,
    repairedVariants: 0,
    currentProductId: null,
    currentProductName: '',
    failures: [],
  }
}

/**
 * Frontend-only, resumable migration for products missing variants and variants that still contain
 * the legacy `standard` placeholder. Normal existing variants remain untouched.
 */
export async function migrateProductsWithoutVariants({ signal, onProgress } = {}) {
  const progress = initialProgress()
  const pendingProductIds = loadPendingProductIds()
  const report = () => onProgress?.({ ...progress, failures: [...progress.failures] })
  let page = 1

  while (true) {
    throwIfAborted(signal)
    progress.page = page
    report()

    const response = await productService.getProducts(
      { page, page_size: MIGRATION_PAGE_SIZE },
      { signal },
    )
    const products = normalizeProductPage(response)
    const exactTotal = normalizeProductTotal(response)
    if (exactTotal != null) progress.totalProducts = exactTotal
    if (products.length === 0) break

    for (const product of products) {
      throwIfAborted(signal)
      const productId = String(product?.id ?? '')
      progress.currentProductId = productId || null
      progress.currentProductName = String(product?.name ?? '')
      report()

      try {
        if (!productId) throw new Error('Product has no id')
        const existingVariants = normalizeVariantList(
          await productService.listProductVariants(productId, { signal }),
        )
        const existingRows = existingVariants.map((variant) => mapApiVariantToRow(variant, 'ar'))
        const hasLegacyStandardAttributes = existingRows.some(
          (row) => row.hasLegacyStandardAttribute,
        )
        const isInterruptedMigration = pendingProductIds.has(productId)
        if (existingVariants.length > 0 && !isInterruptedMigration && !hasLegacyStandardAttributes) {
          progress.skippedProducts += 1
          continue
        }

        const expectedRows = getValidVariantRowsForSave(
          withDefaultedVariantPrices(
            withStandardVariantAttributes(existingRows, product?.colors, product?.size),
            product?.price,
          ),
        )
        if (expectedRows.length === 0) {
          // Products without real options must remain variant-less for the current mobile app.
          // Any fake attribute would be rendered as a required customer-facing selector.
          progress.skippedProducts += 1
          continue
        }
        const rowsToCreate = expectedRows.filter((row) => row.variantId == null)
        if (rowsToCreate.length === 0 && !hasLegacyStandardAttributes) {
          pendingProductIds.delete(productId)
          savePendingProductIds(pendingProductIds)
          progress.skippedProducts += 1
          continue
        }

        pendingProductIds.add(productId)
        savePendingProductIds(pendingProductIds)
        for (const row of expectedRows.filter((candidate) => candidate.variantId != null)) {
          throwIfAborted(signal)
          await productService.updateProductVariant(
            productId,
            row.variantId,
            buildVariantUpdatePayload(row),
          )
          progress.repairedVariants += 1
          report()
        }
        for (const row of rowsToCreate) {
          throwIfAborted(signal)
          await productService.createProductVariantWithInitialStatus(
            productId,
            buildVariantCreatePayload(row),
            row,
          )
          progress.createdVariants += 1
          report()
        }
        pendingProductIds.delete(productId)
        savePendingProductIds(pendingProductIds)
        progress.migratedProducts += 1
      } catch (err) {
        if (signal?.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError') throw err
        progress.failedProducts += 1
        progress.failures.push({
          productId,
          productName: progress.currentProductName,
          message: String(err?.message || 'Migration failed'),
        })
      } finally {
        progress.scannedProducts += 1
        report()
      }
    }

    if (
      products.length < MIGRATION_PAGE_SIZE ||
      (progress.totalProducts != null && progress.scannedProducts >= progress.totalProducts)
    ) {
      break
    }
    page += 1
  }

  progress.currentProductId = null
  progress.currentProductName = ''
  report()
  return progress
}

export function emptyProductVariantMigrationProgress() {
  return initialProgress()
}
