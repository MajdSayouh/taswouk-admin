// Shows a product's price — the lowest variant price when the product has variants, else its own price.
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as productService from '../../services/productService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { normalizeVariantList, getMinVariantPrice } from '../../utils/productVariants.js'

/**
 * @param {{ productId: string | number, price: number | string | null | undefined, className?: string }} props
 */
export function ProductPriceDisplay({ productId, price, className = '' }) {
  const { t } = useTranslation('pages')

  const variantsQuery = useQuery({
    queryKey: queryKeys.products.variants(productId),
    queryFn: async () => {
      const data = await productService.listProductVariants(productId)
      return normalizeVariantList(data)
    },
    enabled: productId != null && productId !== '',
    staleTime: 60_000,
  })

  const minVariantPrice = getMinVariantPrice(variantsQuery.data)
  const hasVariants = Array.isArray(variantsQuery.data) && variantsQuery.data.length > 0
  const displayPrice = minVariantPrice ?? Number(price ?? 0)

  return (
    <span className={`tabular-nums ${className}`}>
      {hasVariants && minVariantPrice != null ? (
        <span title={t('products.detail.fromVariantPrice')}>
          {t('products.detail.fromPricePrefix')} {displayPrice.toFixed(2)}
        </span>
      ) : (
        displayPrice.toFixed(2)
      )}
    </span>
  )
}
