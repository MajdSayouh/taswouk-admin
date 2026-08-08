// View: edit store — general fields use PUT /api/stores/{id}; the custom exchange rate uses its dedicated admin endpoint.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Alert, Spin, Switch, message, Select } from 'antd'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useStoresViewModel } from '../../viewmodels/useStoresViewModel.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea.jsx'
import { LocationPickerMap } from '../../components/maps/LocationPickerMap.jsx'

const STORE_CURRENCY_OPTIONS = [
  { value: 'usd', i18nKey: 'stores.currency.usd' },
  { value: 'syp', i18nKey: 'stores.currency.syp' },
]

function parseExchangeRateInput(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const rate = Number(trimmed)
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 10_000_000_000) return null
  return rate
}

export function StoreEditPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mapOpen, setMapOpen] = useState(false)
  const { setStoreActiveMutation, setStoreBrandMutation } = useStoresViewModel({ fetchOnMount: false })
  const [isActive, setIsActive] = useState(false)
  const [isBrand, setIsBrand] = useState(false)

  const storeQuery = useQuery({
    queryKey: queryKeys.stores.detail(id),
    queryFn: () => storeService.getStore(id),
    enabled: id != null && id !== '',
  })

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    description: '',
    currency: 'syp',
    exchangeRate: '1',
    latitude: '',
    longitude: '',
  })
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [existingLogo, setExistingLogo] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [lastUsdExchangeRate, setLastUsdExchangeRate] = useState('1')
  const [useSystemExchangeRate, setUseSystemExchangeRate] = useState(false)

  const raw = storeQuery.data

  useEffect(() => {
    if (!raw) return
    const nextRate =
      raw?.exchange_rate != null
        ? String(raw.exchange_rate)
        : raw?.exchangeRate != null
          ? String(raw.exchangeRate)
          : ''
    const rawCurrency = String(raw?.currency ?? 'SYP').toLowerCase()
    const nextCurrency = rawCurrency === 'usd' ? 'usd' : 'syp'
    setForm({
      name: raw?.name ?? '',
      phone: raw?.phone ?? '',
      address: raw?.address ?? '',
      description: raw?.description ?? '',
      currency: nextCurrency,
      exchangeRate: nextRate,
      latitude: raw?.latitude != null ? String(raw.latitude) : '',
      longitude: raw?.longitude != null ? String(raw.longitude) : '',
    })
    if (nextRate) setLastUsdExchangeRate(nextRate)
    setUseSystemExchangeRate(nextCurrency === 'usd' && raw?.exchange_rate == null)
    setExistingLogo(raw?.logo ? resolvePublicMediaUrl(raw.logo) : '')
    setIsActive(Boolean(raw.is_active))
    setIsBrand(Boolean(raw.is_brand))
  }, [raw])

  const newLogoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : ''), [logoFile])
  useEffect(() => {
    return () => {
      if (newLogoPreview) URL.revokeObjectURL(newLogoPreview)
    }
  }, [newLogoPreview])

  const updateMutation = useMutation({
    mutationFn: async ({ fields, exchangeRate, logo }) => {
      await storeService.updateStore(id, fields)
      await storeService.updateStoreExchangeRate(id, exchangeRate)
      if (logo) {
        await storeService.patchStoreLogo(id, logo)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all() })
      if (id != null) queryClient.invalidateQueries({ queryKey: queryKeys.stores.detail(id) })
      navigate('/stores')
    },
  })

  function handleChange(ev) {
    const { name, value } = ev.target
    if (name === 'exchangeRate') setLastUsdExchangeRate(value)
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleCurrencyChange(nextCurrency) {
    setForm((prev) => ({
      ...prev,
      currency: nextCurrency,
      exchangeRate:
        nextCurrency === 'syp'
          ? '1'
          : prev.exchangeRate === '1'
            ? lastUsdExchangeRate || '1'
            : prev.exchangeRate,
    }))
  }

  function setCoords(lat, lng) {
    setForm((prev) => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
    }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setSubmitError(null)
    const exchangeRate =
      form.currency === 'syp' || useSystemExchangeRate
        ? null
        : parseExchangeRateInput(form.exchangeRate)
    if (form.currency === 'usd' && !useSystemExchangeRate && exchangeRate == null) {
      setSubmitError(t('stores.edit.exchangeRateErr'))
      return
    }
    const latNum = form.latitude === '' ? null : Number(form.latitude)
    const lngNum = form.longitude === '' ? null : Number(form.longitude)
    updateMutation.mutate({
      fields: {
        name: form.name.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        currency: form.currency.toUpperCase(),
        latitude: latNum != null && !Number.isNaN(latNum) ? latNum : null,
        longitude: lngNum != null && !Number.isNaN(lngNum) ? lngNum : null,
      },
      exchangeRate,
      logo: logoFile,
    })
  }

  const latNum = form.latitude === '' ? null : Number(form.latitude)
  const lngNum = form.longitude === '' ? null : Number(form.longitude)
  const mapLat = latNum != null && !Number.isNaN(latNum) ? latNum : null
  const mapLng = lngNum != null && !Number.isNaN(lngNum) ? lngNum : null

  if (storeQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  const loadError = storeQuery.error?.message ?? null
  if (loadError || storeQuery.isError) {
    return (
      <div className="space-y-4">
        <Alert type="error" title={loadError || t('stores.edit.loadErr')} showIcon />
        <Button as={Link} variant="ghost" to="/stores">
          {t('stores.edit.backStores')}
        </Button>
      </div>
    )
  }

  const error = submitError ?? updateMutation.error?.message ?? null
  const submitting = updateMutation.isPending

  const activePending =
    setStoreActiveMutation.isPending &&
    setStoreActiveMutation.variables != null &&
    String(setStoreActiveMutation.variables.storeId) === String(id)
  const brandPending =
    setStoreBrandMutation.isPending &&
    setStoreBrandMutation.variables != null &&
    String(setStoreBrandMutation.variables.storeId) === String(id)

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title={t('stores.edit.title', { id })}>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-wrap gap-6 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <span className="text-sm font-medium text-slate-800">{t('stores.edit.storeActive')}</span>
              <Switch
                checked={isActive}
                loading={activePending}
                disabled={activePending}
                onChange={async (next) => {
                  const prev = isActive
                  setIsActive(next)
                  try {
                    await setStoreActiveMutation.mutateAsync({ storeId: id, isActive: next })
                  } catch (err) {
                    setIsActive(prev)
                    message.error(err?.message ?? t('stores.edit.activeErr'))
                  }
                }}
              />
            </label>
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <span className="text-sm font-medium text-slate-800">{t('stores.edit.brandStore')}</span>
              <Switch
                checked={isBrand}
                loading={brandPending}
                disabled={brandPending}
                onChange={async (next) => {
                  const prev = isBrand
                  setIsBrand(next)
                  try {
                    await setStoreBrandMutation.mutateAsync({ storeId: id, isBrand: next })
                  } catch (err) {
                    setIsBrand(prev)
                    message.error(err?.message ?? t('stores.edit.brandErr'))
                  }
                }}
              />
            </label>
          </div>
          <Input
            label={t('stores.edit.storeName')}
            name="name"
            value={form.name}
            onChange={handleChange}
            className="md:col-span-2"
          />
          <Input label={t('stores.edit.phone')} name="phone" value={form.phone} onChange={handleChange} />
          <Input
            label={t('stores.edit.addressGov')}
            name="address"
            value={form.address}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('stores.edit.currency')}
            </label>
            <Select
              className="w-full"
              size="large"
              value={form.currency}
              options={STORE_CURRENCY_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.i18nKey),
              }))}
              onChange={handleCurrencyChange}
            />
            <p className="text-xs text-slate-500 mt-1">{t('stores.edit.currencyDesc')}</p>
          </div>
          <Input
            label={t('stores.edit.exchangeRate')}
            name="exchangeRate"
            type="number"
            step="0.01"
            min="0.01"
            max="9999999999.99"
            value={form.currency === 'syp' ? '' : form.exchangeRate}
            onChange={handleChange}
            description={
              form.currency === 'syp'
                ? t('stores.edit.exchangeRateSypDesc')
                : useSystemExchangeRate
                  ? t('stores.edit.exchangeRateSystemDesc')
                  : t('stores.edit.exchangeRateDesc')
            }
            disabled={form.currency === 'syp' || useSystemExchangeRate}
            required={form.currency === 'usd' && !useSystemExchangeRate}
          />
          {form.currency === 'usd' ? (
            <label className="inline-flex items-center gap-3 self-center cursor-pointer select-none">
              <Switch
                checked={useSystemExchangeRate}
                onChange={setUseSystemExchangeRate}
              />
              <span className="text-sm text-slate-700">
                {t('stores.edit.useSystemExchangeRate')}
              </span>
            </label>
          ) : null}
          <Textarea
            label={t('stores.edit.description')}
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="md:col-span-2"
          />

          <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-900">
            <span className="font-medium">{t('stores.edit.logo')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setLogoFile(file)
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900"
            />
            <span className="text-xs text-slate-500">{t('stores.edit.logoHint')}</span>
          </label>
          {newLogoPreview || existingLogo ? (
            <div className="md:col-span-2 flex items-center gap-3">
              <img
                src={newLogoPreview || existingLogo}
                alt={t('stores.edit.logoAlt')}
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              />
              {newLogoPreview ? (
                <span className="text-xs text-slate-500">{t('stores.edit.newPreview')}</span>
              ) : null}
            </div>
          ) : null}

          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <Input
              label={t('stores.edit.lat')}
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={handleChange}
            />
            <Input
              label={t('stores.edit.lng')}
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={handleChange}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setMapOpen((o) => !o)}>
              {mapOpen ? t('stores.edit.mapHide') : t('stores.edit.mapOpen')}
            </Button>
            {mapOpen ? (
              <div className="mt-4">
                <LocationPickerMap latitude={mapLat} longitude={mapLng} onChange={setCoords} height={360} />
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button as={Link} variant="ghost" to="/stores">
              {t('stores.edit.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('stores.edit.saving') : t('stores.edit.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
