import * as productService from './productService.js'
import {
  attrByKey,
  firstNonEmpty,
  isStandardVariantValue,
  normalizeVariantList,
  parseVariantIdFromDto,
} from '../utils/productVariants.js'

const AUDIT_PAGE_SIZE = 50

/** Fixed attribute keys handled by their own color/size fields — anything else is a custom option. */
const FIXED_ATTRIBUTE_KEYS = new Set(['color', 'size'])

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

/** True when a variant's attributes carry no real custom option (anything beyond color/size). */
function hasNoCustomOptions(attrs) {
  if (!Array.isArray(attrs)) return true
  return attrs.every((attribute) => {
    const key = String(attribute?.attribute_key ?? attribute?.key ?? '').trim().toLowerCase()
    if (FIXED_ATTRIBUTE_KEYS.has(key)) return true
    const value = firstNonEmpty(attribute?.value_en, attribute?.value, attribute?.value_ar)
    return !value
  })
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return
  throw new DOMException('Audit stopped', 'AbortError')
}

function initialProgress() {
  return {
    page: 1,
    totalProducts: null,
    scannedProducts: 0,
    failedProducts: 0,
    currentProductId: null,
    currentProductName: '',
    failures: [],
    standardBothMatches: [],
    deletedCount: 0,
    deleteFailedCount: 0,
  }
}

/** A product row summary attached to each match. */
function productSummary(product) {
  return {
    productId: String(product?.id ?? ''),
    name: String(product?.name ?? ''),
    storeId: product?.store_id != null ? String(product.store_id) : '',
    price: product?.price != null ? Number(product.price) : null,
    isActive: product?.is_active ?? true,
  }
}

/**
 * Scans every product's variants. Finds products that have at least one variant whose color AND
 * size attributes are both the legacy "ستاندر"/"Standard" placeholder value, AND that variant
 * carries no other custom option — i.e. a bare placeholder variant, not a real "Standard color,
 * custom option" combination.
 *
 * By default this is read-only and only reports (`standardBothMatches`), for review before any
 * fix is applied. Pass `deleteImmediately: true` to delete each match's variant the moment it's
 * found, using the very same variant list this pass already fetched — no separate re-check pass
 * needed, since there's no gap in time for it to have changed. Only ever the one variant is
 * deleted, never the product; a delete failure is recorded per-product and scanning continues.
 */
export async function scanProductVariantAudit({ signal, onProgress, deleteImmediately = false } = {}) {
  const progress = initialProgress()
  const report = () =>
    onProgress?.({
      ...progress,
      failures: [...progress.failures],
      standardBothMatches: [...progress.standardBothMatches],
    })
  let page = 1

  while (true) {
    throwIfAborted(signal)
    progress.page = page
    report()

    const response = await productService.getProducts(
      { page, page_size: AUDIT_PAGE_SIZE },
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
        const variants = normalizeVariantList(
          await productService.listProductVariants(productId, { signal }),
        )

        const standardBothVariant = variants.find((variant) => {
          const color = attrByKey(variant?.attributes, 'color')
          const size = attrByKey(variant?.attributes, 'size')
          return (
            isStandardVariantValue(color) &&
            isStandardVariantValue(size) &&
            hasNoCustomOptions(variant?.attributes)
          )
        })
        if (standardBothVariant) {
          const variantId = parseVariantIdFromDto(standardBothVariant)
          const match = {
            ...productSummary(product),
            variantId,
            variantCount: variants.length,
          }
          if (deleteImmediately) {
            try {
              if (variantId == null) throw new Error('Could not resolve the variant id')
              await productService.deleteProductVariant(productId, variantId)
              match.deleted = true
              progress.deletedCount += 1
            } catch (deleteErr) {
              if (
                signal?.aborted ||
                deleteErr?.name === 'AbortError' ||
                deleteErr?.name === 'CanceledError'
              ) {
                throw deleteErr
              }
              match.deleted = false
              match.deleteError = String(deleteErr?.message || 'Delete failed')
              progress.deleteFailedCount += 1
            }
          }
          progress.standardBothMatches.push(match)
        }
      } catch (err) {
        if (signal?.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError') throw err
        progress.failedProducts += 1
        progress.failures.push({
          productId,
          productName: progress.currentProductName,
          message: String(err?.message || 'Scan failed'),
        })
      } finally {
        progress.scannedProducts += 1
        report()
      }
    }

    if (
      products.length < AUDIT_PAGE_SIZE ||
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

export function emptyProductVariantAuditProgress() {
  return initialProgress()
}

/** True when a variant is a bare "ستاندر"/"ستاندر" placeholder with no other option. */
function isBareStandardBothVariant(variant) {
  const color = attrByKey(variant?.attributes, 'color')
  const size = attrByKey(variant?.attributes, 'size')
  return (
    isStandardVariantValue(color) &&
    isStandardVariantValue(size) &&
    hasNoCustomOptions(variant?.attributes)
  )
}

function initialCleanupReport(total, dryRun = false) {
  return {
    total,
    dryRun,
    processed: 0,
    currentProductId: null,
    currentProductName: '',
    deleted: [],
    alreadyDone: [],
    skipped: [],
    failed: [],
  }
}

/**
 * Deletes ONLY the variant on each match — never the product itself — and only when it is still,
 * at delete time, the product's single bare "ستاندر"/"ستاندر" (no-option) variant. That guarantees
 * the product ends up with zero variants and that nothing else on it (or any real variant sitting
 * alongside the placeholder) is touched. Re-checks live state right before deleting in case
 * something changed since the scan; anything that no longer matches is skipped, not deleted.
 *
 * A product already at zero variants (e.g. a prior run already deleted it, or this run is being
 * resumed after a stop) lands in `alreadyDone`, not `skipped` — it needs no action and is not a
 * sign something unexpected happened, so re-running this over the same list is always safe.
 *
 * Pass `dryRun: true` to run the exact same live re-check and bucket every match the same way,
 * without ever calling the delete endpoint — useful to preview the outcome on a large list (the
 * `deleted` bucket then means "would be deleted") before committing to the real run.
 *
 * @param {Array<{ productId: string, name: string, variantId: number|string|null, variantCount: number }>} matches
 *   — rows from `scanProductVariantAudit`'s `standardBothMatches`.
 * @param {{ signal?: AbortSignal, onProgress?: (report: object) => void, dryRun?: boolean }} [options]
 */
export async function deleteBareStandardVariants(matches, { signal, onProgress, dryRun = false } = {}) {
  const list = Array.isArray(matches) ? matches : []
  const cleanupReport = initialCleanupReport(list.length, dryRun)
  const emit = () =>
    onProgress?.({
      ...cleanupReport,
      deleted: [...cleanupReport.deleted],
      alreadyDone: [...cleanupReport.alreadyDone],
      skipped: [...cleanupReport.skipped],
      failed: [...cleanupReport.failed],
    })

  for (const match of list) {
    throwIfAborted(signal)
    cleanupReport.currentProductId = match.productId
    cleanupReport.currentProductName = match.name
    emit()

    try {
      const variants = normalizeVariantList(
        await productService.listProductVariants(match.productId, { signal }),
      )
      if (variants.length === 0) {
        cleanupReport.alreadyDone.push({ ...match })
        continue
      }
      if (variants.length !== 1) {
        cleanupReport.skipped.push({ ...match, reason: 'not_single_variant_anymore' })
        continue
      }
      const [onlyVariant] = variants
      if (!isBareStandardBothVariant(onlyVariant)) {
        cleanupReport.skipped.push({ ...match, reason: 'changed_since_scan' })
        continue
      }
      const variantId = parseVariantIdFromDto(onlyVariant)
      if (variantId == null) {
        cleanupReport.skipped.push({ ...match, reason: 'no_variant_id' })
        continue
      }
      if (!dryRun) {
        await productService.deleteProductVariant(match.productId, variantId)
      }
      cleanupReport.deleted.push({ ...match, variantId })
    } catch (err) {
      if (signal?.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError') throw err
      cleanupReport.failed.push({ ...match, message: String(err?.message || 'Delete failed') })
    } finally {
      cleanupReport.processed += 1
      emit()
    }
  }

  cleanupReport.currentProductId = null
  cleanupReport.currentProductName = ''
  emit()
  return cleanupReport
}

export function emptyVariantCleanupReport() {
  return initialCleanupReport(0)
}
