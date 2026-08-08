import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Spin, message } from 'antd'
import * as mallCatalogService from '../../services/mallCatalogService.js'
import {
  mapMallCatalogProductFromApi,
  buildMallCatalogUpdatePayload,
} from '../../models/MallCatalogProduct.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useMallCatalogViewModel } from '../../viewmodels/useMallCatalogViewModel.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { MallCatalogEditorForm } from './MallCatalogEditorForm.jsx'
import { MallCatalogImagesSection } from './MallCatalogImagesSection.jsx'

export function MallCatalogEditPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const navigate = useNavigate()
  const { updateMutation } = useMallCatalogViewModel({ fetchOnMount: false })
  const [form, setForm] = useState({ name: '', description: '', category_id: null, is_active: true })
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const detailQuery = useQuery({
    queryKey: queryKeys.mallCatalog.detail(id),
    queryFn: () => mallCatalogService.getMallCatalogProduct(id),
    enabled: id != null && id !== '',
  })

  const row = detailQuery.data ? mapMallCatalogProductFromApi(detailQuery.data) : null

  // Only hydrate the form from the server once per record id. `row` is a new
  // object reference on every render (mapMallCatalogProductFromApi builds a
  // fresh literal), so depending the effect on `row` itself would re-run on
  // every keystroke and silently wipe unsaved edits (e.g. the description
  // field reverting as soon as you type).
  const hydratedProductIdRef = useRef(null)
  useEffect(() => {
    if (!row) return
    if (hydratedProductIdRef.current === id) return
    hydratedProductIdRef.current = id
    setForm({
      name: row.name,
      description: row.description,
      category_id: row.categoryId ? Number(row.categoryId) : null,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      is_active: row.isActive,
    })
  }, [row, id])

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    if (form.category_id == null || form.category_id === '') {
      setError(t('mallCatalog.edit.categoryRequired'))
      return
    }
    try {
      await updateMutation.mutateAsync({
        productId: id,
        payload: buildMallCatalogUpdatePayload(form),
      })
      message.success(t('mallCatalog.edit.success'))
      navigate('/mall-catalog')
    } catch (err) {
      setError(err?.message ?? t('mallCatalog.edit.failed'))
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  if (detailQuery.isError) {
    return (
      <div className="space-y-4">
        <Alert type="error" showIcon message={detailQuery.error?.message ?? t('mallCatalog.edit.loadErr')} />
        <Button as={Link} variant="ghost" to="/mall-catalog">
          {t('mallCatalog.edit.back')}
        </Button>
      </div>
    )
  }

  const pending = updateMutation.isPending

  return (
    <div className="space-y-6">
      <Link
        to="/mall-catalog"
        className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]"
      >
        {t('mallCatalog.edit.back')}
      </Link>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Card title={t('mallCatalog.edit.title', { id })}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <MallCatalogEditorForm form={form} setForm={setForm} mode="edit" disabled={pending} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.saving') : t('mallCatalog.edit.submit')}
            </Button>
            <Button type="button" variant="secondary" as={Link} to="/mall-catalog">
              {t('mallCatalog.edit.cancel')}
            </Button>
          </div>
        </form>
      </Card>

      {id && row ? (
        <MallCatalogImagesSection productId={id} images={row.images} disabled={pending} />
      ) : null}
    </div>
  )
}
