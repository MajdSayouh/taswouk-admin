// Shows the "offer price" detail row — the way ProductPriceDisplay resolves price: from the
// variants when the product has any, else from the product's own `is_offer`/`new_price`.
//
// This matters because the backend rejects `is_offer`/`price`/`new_price` on a product update
// once that product has variants (offers are managed per-variant from then on) — so the
// product's own `is_offer` field is effectively frozen at whatever it was before variants
// existed, and no longer reflects reality. Reading variant-level `is_offer` instead keeps this
// display accurate for those products. See src/utils/productVariants.js for the API price /
// compare_price swap convention referenced below.
import { useQuery } from '@tanstack/react-query'
import * as productService from '../../services/productService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { normalizeVariantList, dedupeVariantListById } from '../../utils/productVariants.js'

/**
 * @param {{
 *   productId: string | number,
 *   isOffer: boolean | null | undefined,
 *   newPrice: number | string | null | undefined,
 *   label: string,
 *   emptyPlaceholder: string,
 * }} props
 */
export function ProductOfferDisplay({ productId, isOffer, newPrice, label, emptyPlaceholder }) {
  const variantsQuery = useQuery({
    queryKey: queryKeys.products.variants(productId),
    queryFn: async () => {
      const data = await productService.listProductVariants(productId)
      return dedupeVariantListById(normalizeVariantList(data))
    },
    enabled: productId != null && productId !== '',
    staleTime: 60_000,
  })

  const hasVariants = Array.isArray(variantsQuery.data) && variantsQuery.data.length > 0

  let offerPrice = null
  if (hasVariants) {
    const offeringVariants = variantsQuery.data.filter((v) => Boolean(v?.is_offer))
    if (offeringVariants.length === 0) return null
    // API `price` is already the discounted charge while a variant is on offer (see the
    // price/compare_price swap note in productVariants.js), so the lowest `price` among
    // offering variants is the lowest offer price to show here.
    const offerPrices = offeringVariants
      .map((v) => Number(v.price))
      .filter((p) => Number.isFinite(p) && p > 0)
    offerPrice = offerPrices.length > 0 ? Math.min(...offerPrices) : null
  } else {
    if (!isOffer) return null
    offerPrice = newPrice != null ? Number(newPrice) : null
  }

  return (
    <div className="flex justify-between gap-4 sm:justify-start sm:gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 tabular-nums">
        {offerPrice != null && Number.isFinite(offerPrice) ? offerPrice.toFixed(2) : emptyPlaceholder}
      </dd>
    </div>
  )
}
