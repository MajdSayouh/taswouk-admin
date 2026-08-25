// View: product detail — GET /api/products/{id}.
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Spin, Tag } from 'antd'
import * as productService from '../../services/productService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { AuthenticatedProductImage } from '../../components/products/AuthenticatedProductImage.jsx'
import { Card } from '../../components/ui/Card'
import { HtmlContent } from '../../components/ui/HtmlContent.jsx'
import { Button } from '../../components/ui/Button'
import { ProductVariantsPanel } from '../../components/products/ProductVariantsPanel.jsx'
import { ProductPriceDisplay } from '../../components/products/ProductPriceDisplay.jsx'
import { ProductOfferDisplay } from '../../components/products/ProductOfferDisplay.jsx'

export function ProductDetailPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const returnToParam = searchParams.get('return_to')
  const productsReturnTo =
    typeof returnToParam === 'string' && returnToParam.startsWith('/products')
      ? returnToParam
      : '/products'
  const editQuery = new URLSearchParams({ return_to: productsReturnTo }).toString()

  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: id != null && id !== '',
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <Alert
          type="error"
          title={error?.message ?? t('shared.notFound')}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('products.detail.retry')}
            </Button>
          }
        />
        <Button as={Link} variant="ghost" to={productsReturnTo}>
          {t('products.detail.back')}
        </Button>
      </div>
    )
  }

  const images = Array.isArray(product.images) ? product.images : []
  const videos = Array.isArray(product.videos) ? product.videos : []
  const em = t('shared.emDash')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{product.name}</h2>
          <p className="text-sm text-slate-500">{t('products.detail.productRef', { id: product.id })}</p>
        </div>
        <div className="flex gap-2">
          <Button as={Link} variant="ghost" to={productsReturnTo}>
            {t('products.detail.allProducts')}
          </Button>
          <Button as={Link} to={`/products/${id}/edit?${editQuery}`}>
            {t('products.detail.edit')}
          </Button>
        </div>
      </div>

      <Card title={t('products.detail.detailsCard')}>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:justify-start sm:gap-2">
            <dt className="text-slate-500">{t('products.detail.storeId')}</dt>
            <dd className="font-medium text-slate-900 tabular-nums">
              {product.store_id ?? em}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:justify-start sm:gap-2">
            <dt className="text-slate-500">{t('products.detail.category')}</dt>
            <dd className="text-slate-800 text-right sm:text-left">
              {[product.category, product.sub_category].filter(Boolean).join(' · ') || em}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:justify-start sm:gap-2">
            <dt className="text-slate-500">{t('products.detail.price')}</dt>
            <dd className="font-medium text-slate-900">
              <ProductPriceDisplay productId={product.id} price={product.price} />
            </dd>
          </div>
          <ProductOfferDisplay
            productId={product.id}
            isOffer={product.is_offer}
            newPrice={product.new_price}
            label={t('products.detail.offerPrice')}
            emptyPlaceholder={em}
          />
          <div className="flex justify-between gap-4 sm:justify-start sm:gap-2">
            <dt className="text-slate-500">{t('products.detail.status')}</dt>
            <dd>
              {product.is_active ? (
                <Tag color="green">{t('shared.active')}</Tag>
              ) : (
                <Tag>{t('shared.inactive')}</Tag>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:justify-start sm:gap-2">
            <dt className="text-slate-500">{t('products.detail.created')}</dt>
            <dd className="text-slate-800">{product.created_at ?? em}</dd>
          </div>
        </dl>
      </Card>

      <Card title={t('products.detail.description')}>
        <HtmlContent
          html={product.description}
          empty={<span className="text-sm text-slate-500">{em}</span>}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t('products.detail.imagesCard')}>
          {images.length === 0 ? (
            <p className="text-sm text-slate-500">{t('products.detail.noImages')}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {images.map((img) => {
                const raw =
                  typeof img === 'string'
                    ? img
                    : typeof img === 'object' && img?.image
                      ? img.image
                      : null
                const key = typeof img === 'object' && img?.id != null ? img.id : raw
                if (!raw) return null
                const isFeatured = typeof img === 'object' && img != null && Boolean(img.is_featured)
                return (
                  <div key={key} className="relative shrink-0">
                    <AuthenticatedProductImage
                      productId={product.id}
                      storagePath={raw}
                      alt=""
                      width={120}
                      height={120}
                      className="rounded-lg object-cover border border-slate-200 block max-w-none"
                    />
                    {isFeatured ? (
                      <span className="absolute top-1 left-1 rounded bg-amber-600/95 text-[10px] font-semibold text-white px-1.5 py-0.5 shadow-sm">
                        {t('products.images.coverRadio')}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title={t('products.detail.videosCard')}>
          {videos.length === 0 ? (
            <p className="text-sm text-slate-500">{t('products.detail.noVideos')}</p>
          ) : (
            <div className="space-y-3">
              {videos.map((video, index) => {
                const url = typeof video === 'object' && video != null ? video.url : video
                if (!url) return null
                const src = resolvePublicMediaUrl(url, { productId: product.id }) || String(url)
                return (
                  <video
                    key={typeof video === 'object' && video?.id != null ? video.id : `${url}-${index}`}
                    src={src}
                    controls
                    className="w-full rounded-lg border border-slate-200 bg-black"
                  />
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Alert
        type="info"
        showIcon
        className="mb-0"
        message={t('products.detail.variantsReadOnlyHelp')}
        action={
          <Button
            as={Link}
            to={`/products/${id}/edit?${editQuery}#variants`}
            className="!py-1.5 !px-3 !h-8 text-xs"
          >
            {t('products.detail.manageVariantPrices')}
          </Button>
        }
      />

      <ProductVariantsPanel productId={id} product={product} readOnly />
    </div>
  )
}
