import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, message } from 'antd'
import { useMallCatalogViewModel } from '../../viewmodels/useMallCatalogViewModel.js'
import * as mallCatalogService from '../../services/mallCatalogService.js'
import { buildMallCatalogCreatePayload } from '../../models/MallCatalogProduct.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { MallCatalogEditorForm } from './MallCatalogEditorForm.jsx'

function emptyForm() {
  return { name: '', description: '', category_id: null }
}

export function MallCatalogCreatePage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { createMutation } = useMallCatalogViewModel({ fetchOnMount: false })
  const [form, setForm] = useState(emptyForm)
  const [imageFiles, setImageFiles] = useState(/** @type {File[]} */ ([]))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    if (!String(form.name).trim()) {
      setError(t('mallCatalog.create.nameRequired'))
      return
    }
    if (form.category_id == null || form.category_id === '') {
      setError(t('mallCatalog.create.categoryRequired'))
      return
    }
    setSubmitting(true)
    try {
      const created = await createMutation.mutateAsync(buildMallCatalogCreatePayload(form))
      message.success(t('mallCatalog.create.success'))
      const productId = created?.id ?? created?.product?.id
      if (productId != null && productId !== '') {
        if (imageFiles.length > 0) {
          try {
            await mallCatalogService.uploadMallCatalogProductImages(productId, imageFiles)
          } catch (uploadErr) {
            message.warning(uploadErr?.message ?? t('mallCatalog.create.imagesUploadErr'))
          }
        }
        navigate(`/mall-catalog/${productId}/edit`)
      } else {
        navigate('/mall-catalog')
      }
    } catch (err) {
      setError(err?.message ?? t('mallCatalog.create.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const pending = createMutation.isPending || submitting

  return (
    <div className="space-y-6">
      <Link
        to="/mall-catalog"
        className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]"
      >
        {t('mallCatalog.create.back')}
      </Link>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Card title={t('mallCatalog.create.title')}>
        <p className="text-sm text-slate-600 mb-4">{t('mallCatalog.create.imagesHint')}</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <MallCatalogEditorForm form={form} setForm={setForm} mode="create" disabled={pending} />

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">{t('mallCatalog.create.images')}</p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={pending}
              onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.creating') : t('mallCatalog.create.submit')}
            </Button>
            <Button type="button" variant="secondary" as={Link} to="/mall-catalog">
              {t('mallCatalog.create.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
