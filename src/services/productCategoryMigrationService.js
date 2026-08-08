import * as productService from './productService.js'

const MIGRATION_PAGE_SIZE = 50
const UPDATE_INTERVAL_MS = 250
const MAX_RATE_LIMIT_RETRIES = 3

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
  throw new DOMException('Migration stopped', 'AbortError')
}

function wait(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Migration stopped', 'AbortError'))
      return
    }
    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId)
      reject(new DOMException('Migration stopped', 'AbortError'))
    }
    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

async function updateCategoryWithRetry(productId, destinationCategoryId, signal) {
  for (let attempt = 0; ; attempt += 1) {
    throwIfAborted(signal)
    try {
      return await productService.updateProduct(
        productId,
        { category_id: destinationCategoryId },
        { signal },
      )
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError' || error?.name === 'CanceledError') {
        throw error
      }
      if (error?.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) throw error
      await wait(750 * (2 ** attempt), signal)
    }
  }
}

function initialProgress() {
  return {
    phase: 'idle',
    pagesScanned: 0,
    totalProducts: null,
    discoveredProducts: 0,
    processedProducts: 0,
    movedProducts: 0,
    failedProducts: 0,
    currentProductId: null,
    currentProductName: '',
    failures: [],
  }
}

/**
 * Frontend-only migration that changes only `category_id` for a fixed snapshot of products.
 * Re-running it is safe because already moved products no longer match the source category.
 */
export async function migrateProductsToSubcategory({
  sourceCategoryId,
  destinationCategoryId,
  storeId,
  signal,
  onProgress,
} = {}) {
  const sourceId = Number(sourceCategoryId)
  const destinationId = Number(destinationCategoryId)
  const scopedStoreId = storeId == null || storeId === '' ? null : Number(storeId)

  if (!Number.isInteger(sourceId) || sourceId <= 0) throw new Error('Invalid source category')
  if (!Number.isInteger(destinationId) || destinationId <= 0) {
    throw new Error('Invalid destination category')
  }
  if (sourceId === destinationId) throw new Error('Source and destination must be different')
  if (scopedStoreId != null && (!Number.isInteger(scopedStoreId) || scopedStoreId <= 0)) {
    throw new Error('Invalid store')
  }

  const progress = initialProgress()
  const targets = []
  const targetIds = new Set()
  const report = () => onProgress?.({ ...progress, failures: [...progress.failures] })

  progress.phase = 'scanning'
  let page = 1
  while (true) {
    throwIfAborted(signal)
    const response = await productService.getProducts(
      {
        page,
        page_size: MIGRATION_PAGE_SIZE,
        category_id: sourceId,
        ...(scopedStoreId != null ? { store_id: scopedStoreId } : {}),
      },
      { signal },
    )
    const products = normalizeProductPage(response)
    const exactTotal = normalizeProductTotal(response)
    if (exactTotal != null) progress.totalProducts = exactTotal

    const targetsBeforePage = targets.length
    for (const product of products) {
      const productId = String(product?.id ?? '')
      if (!productId || targetIds.has(productId)) continue
      targetIds.add(productId)
      targets.push({ id: productId, name: String(product?.name ?? '') })
    }
    progress.pagesScanned = page
    progress.discoveredProducts = targets.length
    report()

    if (
      targets.length === targetsBeforePage ||
      products.length < MIGRATION_PAGE_SIZE ||
      (progress.totalProducts != null && targets.length >= progress.totalProducts)
    ) {
      break
    }
    page += 1
  }

  progress.phase = 'moving'
  progress.totalProducts = targets.length
  report()

  for (let index = 0; index < targets.length; index += 1) {
    throwIfAborted(signal)
    const product = targets[index]
    progress.currentProductId = product.id
    progress.currentProductName = product.name
    report()

    try {
      await updateCategoryWithRetry(product.id, destinationId, signal)
      progress.movedProducts += 1
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError' || error?.name === 'CanceledError') {
        throw error
      }
      progress.failedProducts += 1
      progress.failures.push({
        productId: product.id,
        productName: product.name,
        message: String(error?.message || 'Migration failed'),
      })
    } finally {
      progress.processedProducts += 1
      report()
    }

    if (index < targets.length - 1) await wait(UPDATE_INTERVAL_MS, signal)
  }

  progress.phase = 'done'
  progress.currentProductId = null
  progress.currentProductName = ''
  report()
  return progress
}

export function emptyProductCategoryMigrationProgress() {
  return initialProgress()
}
