// Mall catalog product images — upload / set featured / delete.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Popconfirm, Spin, Tag, message } from 'antd'
import * as mallCatalogService from '../../services/mallCatalogService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'

/**
 * @param {{
 *   productId: string | number
 *   images: Array<{ id: string, image: string, isFeatured: boolean }>
 *   disabled?: boolean
 * }} props
 */
export function MallCatalogImagesSection({ productId, images, disabled = false }) {
  const { t } = useTranslation('pages')
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [busyImageId, setBusyImageId] = useState(/** @type {string | null} */ (null))

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
  }, [images])

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.mallCatalog.detail(productId) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.mallCatalog.all() })
  }

  async function handleUpload(ev) {
    const files = Array.from(ev.target.files ?? [])
    ev.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    try {
      await mallCatalogService.uploadMallCatalogProductImages(productId, files)
      message.success(t('mallCatalog.images.uploaded'))
      await invalidate()
    } catch (err) {
      message.error(err?.message ?? t('mallCatalog.images.uploadErr'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSetFeatured(imageId) {
    setBusyImageId(imageId)
    try {
      await mallCatalogService.setFeaturedMallCatalogProductImage(productId, imageId)
      message.success(t('mallCatalog.images.featuredUpdated'))
      await invalidate()
    } catch (err) {
      message.error(err?.message ?? t('mallCatalog.images.featuredErr'))
    } finally {
      setBusyImageId(null)
    }
  }

  async function handleDelete(imageId) {
    setBusyImageId(imageId)
    try {
      await mallCatalogService.deleteMallCatalogProductImage(productId, imageId)
      message.success(t('mallCatalog.images.deleted'))
      await invalidate()
    } catch (err) {
      message.error(err?.message ?? t('mallCatalog.images.deleteErr'))
    } finally {
      setBusyImageId(null)
    }
  }

  const pending = disabled || uploading

  return (
    <Card title={t('mallCatalog.images.title')}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-600 mb-2">{t('mallCatalog.images.uploadHint')}</p>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={pending}
            onChange={handleUpload}
          />
        </div>

        {sortedImages.length === 0 ? (
          <Alert type="info" showIcon message={t('mallCatalog.images.empty')} />
        ) : (
          <Spin spinning={pending}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedImages.map((img) => {
                const busy = busyImageId === img.id
                return (
                  <div
                    key={img.id}
                    className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/60"
                  >
                    <div className="relative">
                      <img
                        src={resolvePublicMediaUrl(img.image)}
                        alt=""
                        className="h-36 w-full rounded-md object-cover border border-slate-200 bg-white"
                      />
                      {img.isFeatured ? (
                        <Tag color="orange" className="absolute top-2 start-2 m-0">
                          {t('mallCatalog.images.featured')}
                        </Tag>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!img.isFeatured ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy || pending}
                          onClick={() => handleSetFeatured(img.id)}
                        >
                          {t('mallCatalog.images.setFeatured')}
                        </Button>
                      ) : null}
                      <Popconfirm
                        title={t('mallCatalog.images.deleteTitle')}
                        description={t('mallCatalog.images.deleteDesc')}
                        onConfirm={() => handleDelete(img.id)}
                        okButtonProps={{ danger: true }}
                      >
                        <Button type="button" variant="ghost" disabled={busy || pending}>
                          {t('shared.delete')}
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                )
              })}
            </div>
          </Spin>
        )}
      </div>
    </Card>
  )
}
