// Admin: PUT /api/malls/{id} — edit mall, logo, product assignments.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Alert, Spin, Popconfirm, message } from 'antd'
import * as mallService from '../../services/mallService.js'
import {
  mapMallFromApi,
  buildMallUpdatePayload,
  isValidMallExchangeRateInput,
  mallExchangeRateForApi,
} from '../../models/Mall.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useMallsViewModel } from '../../viewmodels/useMallsViewModel.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { MallEditorForm } from './MallEditorForm.jsx'
import { MallProductsSection } from './MallProductsSection.jsx'

export function MallEditPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { updateMall, deleteMall } = useMallsViewModel({ fetchOnMount: false })

  const detailQuery = useQuery({
    queryKey: queryKeys.malls.detail(id),
    queryFn: () => mallService.getMall(id),
    enabled: id != null && id !== '',
  })

  const [form, setForm] = useState({
    name: '',
    description: '',
    start_working_at: '',
    end_working_at: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    contact_email: '',
    minimum_order: 0,
    price_match: false,
    is_active: true,
    exchange_rate: '',
    currency: 'syp',
  })
  const [mapOpen, setMapOpen] = useState(false)
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [existingLogo, setExistingLogo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const raw = detailQuery.data
  const row = raw ? mapMallFromApi(raw) : null

  // Only hydrate the form from the server once per mall id. `row` is a new object reference on
  // every render (mapMallFromApi builds a fresh literal), so depending the effect on `row` itself
  // re-ran on every keystroke/select change — and would also re-run on any background refetch —
  // silently wiping unsaved edits (the currency select and exchange rate field appearing "stuck"
  // was this: the value reverted right after every change).
  const hydratedMallIdRef = useRef(null)
  useEffect(() => {
    if (!row) return
    if (hydratedMallIdRef.current === id) return
    hydratedMallIdRef.current = id
    setForm({
      name: row.name ?? '',
      description: row.description ?? '',
      start_working_at: row.startWorkingAt ?? '',
      end_working_at: row.endWorkingAt ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      latitude: row.latitude ?? '',
      longitude: row.longitude ?? '',
      contact_email: row.contactEmail ?? '',
      minimum_order: row.minimumOrder ?? 0,
      price_match: row.priceMatch,
      is_active: row.isActive,
      exchange_rate: row.exchangeRate ?? '',
      currency: String(row.currency ?? 'SYP').toLowerCase(),
    })
    setExistingLogo(row.logoUrl ? resolvePublicMediaUrl(row.logoUrl) : '')
  }, [row, id])

  const newLogoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : ''), [logoFile])
  useEffect(() => {
    return () => {
      if (newLogoPreview) URL.revokeObjectURL(newLogoPreview)
    }
  }, [newLogoPreview])

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    if (!isValidMallExchangeRateInput(form.exchange_rate)) {
      setError(t('malls.editor.exchangeRateError'))
      return
    }
    setSubmitting(true)
    try {
      await updateMall(id, buildMallUpdatePayload(form))
      const exchangeRate = mallExchangeRateForApi(form.exchange_rate)
      if (exchangeRate !== row?.exchangeRate) {
        await mallService.setMallExchangeRate(id, exchangeRate)
      }
      if (logoFile) {
        await mallService.uploadMallLogo(id, logoFile)
      }
      message.success(t('malls.edit.updated'))
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.all() })
    } catch (err) {
      setError(err?.message ?? t('malls.edit.updateErr'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteLogo() {
    try {
      await mallService.deleteMallLogo(id)
      setExistingLogo('')
      setLogoFile(null)
      message.success(t('malls.edit.logoRemoved'))
      queryClient.invalidateQueries({ queryKey: queryKeys.malls.detail(id) })
    } catch (err) {
      message.error(err?.message ?? t('malls.edit.logoRemoveErr'))
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteMall(id)
      message.success(t('malls.edit.deleted'))
      navigate('/malls')
    } catch (err) {
      message.error(err?.message ?? t('malls.edit.deleteErr'))
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

  if (detailQuery.isError) {
    return (
      <div className="space-y-4">
        <Alert type="error" showIcon message={detailQuery.error?.message ?? t('malls.edit.loadErr')} />
        <Button as={Link} variant="ghost" to="/malls">
          {t('malls.edit.back')}
        </Button>
      </div>
    )
  }

  const pending = submitting

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/malls" className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]">
          {t('malls.edit.back')}
        </Link>
      </div>
      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card title={t('malls.edit.title', { id })}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <MallEditorForm
            form={form}
            setForm={setForm}
            mode="edit"
            disabled={pending}
            mapOpen={mapOpen}
            setMapOpen={setMapOpen}
          />

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">{t('malls.edit.logo')}</p>
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
                {existingLogo && !logoFile ? (
                  <Button type="button" variant="ghost" onClick={handleDeleteLogo}>
                    {t('malls.edit.removeLogo')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.saving') : t('malls.edit.submit')}
            </Button>
            <Popconfirm
              title={t('malls.edit.deleteTitle')}
              description={t('malls.edit.deleteDesc')}
              onConfirm={handleDelete}
              okButtonProps={{ danger: true }}
            >
              <Button type="button" variant="secondary" disabled={deleting}>
                {t('malls.edit.delete')}
              </Button>
            </Popconfirm>
          </div>
        </form>
      </Card>

      {id ? <MallProductsSection mallId={id} /> : null}
    </div>
  )
}
