// View: product detail — GET /api/products/{id}.
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Alert, Spin, Tag } from 'antd'
import * as productService from '../../services/productService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { AuthenticatedProductImage } from '../../components/products/AuthenticatedProductImage.jsx'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function ProductDetailPage() {
  const { id } = useParams()

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
          title={error?.message ?? 'Not found'}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
        <Button as={Link} variant="ghost" to="/admin/products">
          Back to products
        </Button>
      </div>
    )
  }

  const images = Array.isArray(product.images) ? product.images : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{product.name}</h2>
          <p className="text-sm text-slate-500">Product #{product.id}</p>
        </div>
        <div className="flex gap-2">
          <Button as={Link} variant="ghost" to="/admin/products">
            All products
          </Button>
          <Button as={Link} to={`/admin/products/${id}/edit`}>
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Details">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Store ID</dt>
              <dd className="font-medium text-slate-900 tabular-nums">{product.store_id ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Category</dt>
              <dd className="text-slate-800 text-right">
                {[product.category, product.sub_category].filter(Boolean).join(' · ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Price (SAR)</dt>
              <dd className="font-medium text-slate-900 tabular-nums">
                {Number(product.price ?? 0).toFixed(2)}
              </dd>
            </div>
            {product.is_offer ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Offer price</dt>
                <dd className="font-medium text-slate-900 tabular-nums">
                  {product.new_price != null ? Number(product.new_price).toFixed(2) : '—'}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Rating</dt>
              <dd className="text-slate-800">{product.rate ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd>
                {product.is_active ? (
                  <Tag color="green">Active</Tag>
                ) : (
                  <Tag>Inactive</Tag>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-800">{product.created_at ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 mb-1">Description</dt>
              <dd className="text-slate-800 whitespace-pre-wrap">
                {product.description?.trim() ? product.description : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Images">
          {images.length === 0 ? (
            <p className="text-sm text-slate-500">No images for this product.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {images.map((img) => {
                const raw = typeof img === 'object' && img?.image ? img.image : null
                const key = typeof img === 'object' && img?.id != null ? img.id : raw
                if (!raw) return null
                return (
                  <AuthenticatedProductImage
                    key={key}
                    productId={product.id}
                    storagePath={raw}
                    alt=""
                    width={120}
                    height={120}
                    className="rounded-lg object-cover border border-slate-200 block max-w-none"
                  />
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
