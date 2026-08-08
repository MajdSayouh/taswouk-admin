import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Spin, Popconfirm, message } from 'antd'
import * as externalShopService from '../../services/externalShopService.js'
import {
  mapExternalShopFromApi,
  buildExternalShopUpdatePayload,
} from '../../models/ExternalShop.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useExternalShopsViewModel } from '../../viewmodels/useExternalShopsViewModel.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ExternalShopEditorForm } from './ExternalShopEditorForm.jsx'

export function ExternalShopEditPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { updateShop, deleteShop } = useExternalShopsViewModel({ fetchOnMount: false })

  const detailQuery = useQuery({
    queryKey: queryKeys.externalShops.detail(id),
    queryFn: () => externalShopService.getExternalShop(id),
    enabled: id != null && id !== '',
  })

  const [form, setForm] = useState({
    name: '',
    base_url: '',
    is_active: true,
    requires_vpn: false,
  })
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [existingLogo, setExistingLogo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  // Mapping creates a new object. Memoize it so ordinary form state updates do not retrigger the
  // hydration effect and replace the character/toggle value the user just entered.
  const row = useMemo(
    () => (detailQuery.data ? mapExternalShopFromApi(detailQuery.data) : null),
    [detailQuery.data],
  )
  const hydratedShopIdRef = useRef(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!row) return
    const shopId = String(id ?? row.id)
    // Preserve edits across background refetches. A different route id still hydrates normally.
    if (hydratedShopIdRef.current === shopId) return
    hydratedShopIdRef.current = shopId
    setForm({
      name: row.name ?? '',
      base_url: row.baseUrl ?? '',
      is_active: row.isActive,
      requires_vpn: row.requiresVpn,
    })
    setExistingLogo(row.logoUrl ? resolvePublicMediaUrl(row.logoUrl) : '')
  }, [id, row])

  const newLogoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : ''), [logoFile])
  useEffect(() => {
    return () => {
      if (newLogoPreview) URL.revokeObjectURL(newLogoPreview)
    }
  }, [newLogoPreview])

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    if (!String(form.name).trim()) {
      setError(t('externalShops.create.nameRequired'))
      return
    }
    if (!String(form.base_url).trim()) {
      setError(t('externalShops.create.baseUrlRequired'))
      return
    }
    setSubmitting(true)
    try {
      await updateShop(id, buildExternalShopUpdatePayload(form))
      if (logoFile) {
        await externalShopService.uploadExternalShopLogo(id, logoFile)
      }
      message.success(t('externalShops.edit.updated'))
      queryClient.invalidateQueries({ queryKey: queryKeys.externalShops.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.externalShops.all() })
      setLogoFile(null)
    } catch (err) {
      setError(err?.message ?? t('externalShops.edit.updateErr'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteShop(id)
      message.success(t('externalShops.edit.deleted'))
      navigate('/external-shops')
    } catch (err) {
      message.error(err?.message ?? t('externalShops.edit.deleteErr'))
    } finally {
      setDeleting(false)
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  if (detailQuery.isError || !row) {
    return (
      <div className="space-y-4">
        <Alert
          type="error"
          showIcon
          message={detailQuery.error?.message ?? t('externalShops.edit.loadErr')}
        />
        <Button as={Link} variant="ghost" to="/external-shops">
          {t('externalShops.edit.back')}
        </Button>
      </div>
    )
  }

  const pending = submitting

  return (
    <div className="space-y-6">
      <Link
        to="/external-shops"
        className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]"
      >
        {t('externalShops.edit.back')}
      </Link>
      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card title={t('externalShops.edit.title', { id })}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <ExternalShopEditorForm form={form} setForm={setForm} mode="edit" disabled={pending} />

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">{t('externalShops.edit.logo')}</p>
            <div className="flex flex-wrap items-start gap-4">
              {newLogoPreview || existingLogo ? (
                <img
                  src={newLogoPreview || existingLogo}
                  alt=""
                  className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg border border-dashed border-slate-300 bg-slate-50" />
              )}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={pending}
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-slate-500">{t('externalShops.edit.logoHint')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.saving') : t('externalShops.edit.submit')}
            </Button>
            <Button type="button" variant="secondary" as={Link} to="/external-shops">
              {t('externalShops.edit.cancel')}
            </Button>
            <Popconfirm
              title={t('externalShops.edit.deleteTitle')}
              description={t('externalShops.edit.deleteDesc')}
              onConfirm={handleDelete}
              okButtonProps={{ danger: true }}
            >
              <Button type="button" variant="secondary" disabled={deleting}>
                {t('externalShops.edit.delete')}
              </Button>
            </Popconfirm>
          </div>
        </form>
      </Card>
    </div>
  )
}
