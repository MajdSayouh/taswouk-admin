// View: create store — admin uses POST /api/stores/admin/create-with-logo; seller uses POST /api/stores/my/create.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Select, Spin, Switch } from 'antd'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useAuthStore, isAdminRole, isSellerRole } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea.jsx'
import { LocationPickerMap } from '../../components/maps/LocationPickerMap.jsx'
import { useSellersViewModel } from '../../viewmodels/useSellersViewModel.js'
import { SYRIAN_GOVERNORATE_OPTIONS } from '../../constants/syrianGovernorates.js'

const STORE_CURRENCY_OPTIONS = [
  { value: 'usd', i18nKey: 'stores.currency.usd' },
  { value: 'syp', i18nKey: 'stores.currency.syp' },
]

const STORE_TYPE_OPTIONS = ['global', 'syrian', 'grocery', 'restaurant']

/**
 * @param {{ firstName?: string; lastName?: string; email?: string; id: string }} s
 */
function formatSellerLabel(s) {
  const name = [s.firstName, s.lastName].filter(Boolean).join(' ').trim()
  if (name && s.email) return `${name} (${s.email})`
  if (name) return `${name} · #${s.id}`
  if (s.email) return `${s.email} · #${s.id}`
  return `#${s.id}`
}

function emptyForm(restaurantMode = false) {
  return {
    sellerId: '',
    name: '',
    description: '',
    phone: '',
    address: '',
    currency: 'syp',
    exchangeRate: '1',
    latitude: '',
    longitude: '',
    storeType: restaurantMode ? 'restaurant' : 'global',
    startWorkingAt: '',
    endWorkingAt: '',
    preparationTime: '',
    // Explicit — the admin/seller create endpoints don't set this on their own, and the store
    // otherwise stays invisible on the public site/app until someone remembers a separate
    // "toggle active" step after creation.
    isActive: true,
  }
}

function parseExchangeRateInput(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const rate = Number(trimmed)
  if (!Number.isInteger(rate)) return null
  return rate
}

function normalizeTime(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed && trimmed.length === 5 ? `${trimmed}:00` : trimmed || null
}

export function StoreCreatePage({ restaurantMode = false }) {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState(() => emptyForm(restaurantMode))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [lastUsdExchangeRate, setLastUsdExchangeRate] = useState('1')

  const isAdmin = useMemo(() => (user ? isAdminRole(user.role) : false), [user])
  const isSeller = useMemo(() => (user ? isSellerRole(user.role) : false), [user])
  const {
    sellers,
    loading: sellersLoading,
    error: sellersLoadError,
  } = useSellersViewModel({ fetchOnMount: isAdmin })
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : ''), [logoFile])

  const sellerSelectOptions = useMemo(() => {
    const rows = sellers.map((s) => ({
      value: String(s.id),
      label: formatSellerLabel(s),
    }))
    const sid = String(form.sellerId ?? '').trim()
    if (sid && !rows.some((r) => r.value === sid)) {
      rows.push({
        value: sid,
        label: String(t('stores.create.sellerPreset', { id: sid })),
      })
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label))
  }, [sellers, form.sellerId, t])

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  useEffect(() => {
    const q = searchParams.get('seller_id')
    if (q != null && String(q).trim() !== '') {
      setForm((prev) => ({ ...prev, sellerId: String(q).trim() }))
    }
  }, [searchParams])

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
    setError(null)

    const nameTrim = form.name.trim()
    if (!nameTrim || nameTrim.length < 2) {
      setError(t('stores.create.nameErr'))
      return
    }

    if (isAdmin) {
      const sid = Number(form.sellerId)
      if (!Number.isFinite(sid) || sid <= 0) {
        setError(t('stores.create.sellerErr'))
        return
      }
    }

    if (!isAdmin && !isSeller) {
      setError(t('stores.create.roleErr'))
      return
    }

    const desc = form.description.trim() || null
    const phone = form.phone.trim() || null
    const address = form.address.trim() || null
    const exchangeRate =
      form.currency === 'syp' ? 1 : parseExchangeRateInput(form.exchangeRate)
    const lat =
      form.latitude === '' || form.latitude == null ? null : Number(form.latitude)
    const lng =
      form.longitude === '' || form.longitude == null ? null : Number(form.longitude)

    if (form.currency === 'usd' && exchangeRate == null) {
      setError(t('stores.create.exchangeRateErr'))
      return
    }


    const hasStart = Boolean(form.startWorkingAt)
    const hasEnd = Boolean(form.endWorkingAt)
    if (hasStart !== hasEnd) {
      setError(t('stores.validation.workingHoursPair'))
      return
    }
    const preparationTime = form.preparationTime === '' ? null : Number(form.preparationTime)
    if (
      preparationTime != null &&
      (!Number.isInteger(preparationTime) || preparationTime < 0 || preparationTime > 1440)
    ) {
      setError(t('stores.validation.preparationTime'))
      return
    }

    const restaurantFields = {
      store_type: restaurantMode ? 'restaurant' : form.storeType,
      start_working_at: normalizeTime(form.startWorkingAt),
      end_working_at: normalizeTime(form.endWorkingAt),
      preparation_time: preparationTime,
      currency: form.currency.toUpperCase(),
    }

    setSubmitting(true)
    try {
      if (isAdmin) {
        await storeService.adminCreateStore({
          seller_id: Number(form.sellerId),
          name: nameTrim,
          description: desc,
          phone,
          address,
          latitude: lat != null && !Number.isNaN(lat) ? lat : null,
          longitude: lng != null && !Number.isNaN(lng) ? lng : null,
          exchange_rate: exchangeRate,
          ...restaurantFields,
          logo: logoFile || undefined,
          is_active: form.isActive,
        })
      } else {
        await storeService.sellerCreateStore({
          name: nameTrim,
          description: desc,
          phone,
          address,
          latitude: lat != null && !Number.isNaN(lat) ? lat : null,
          longitude: lng != null && !Number.isNaN(lng) ? lng : null,
          exchange_rate: exchangeRate,
          ...restaurantFields,
          logo: logoFile || undefined,
          is_active: form.isActive,
        })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all() })
      navigate(restaurantMode ? '/restaurants' : '/stores')
    } catch (err) {
      setError(err?.message ?? t('stores.create.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const latNum = form.latitude === '' ? null : Number(form.latitude)
  const lngNum = form.longitude === '' ? null : Number(form.longitude)
  const mapLat = latNum != null && !Number.isNaN(latNum) ? latNum : null
  const mapLng = lngNum != null && !Number.isNaN(lngNum) ? lngNum : null

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAdmin && !isSeller) {
    return (
      <div className="space-y-4">
        <Alert type="warning" title={t('stores.create.roleWarning')} showIcon />
        <Button as={Link} variant="ghost" to="/home">
          {t('stores.create.backDash')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title={t(restaurantMode ? 'restaurants.create.title' : 'stores.create.title')}>
        <p className="text-sm text-slate-600 mb-4">
          {restaurantMode
            ? t('restaurants.create.hint')
            : isAdmin
              ? t('stores.create.adminHint')
              : t('stores.create.sellerHint')}
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {isAdmin ? (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="store-create-seller">
                {t('stores.create.sellerId')}
              </label>
              <Select
                id="store-create-seller"
                showSearch
                optionFilterProp="label"
                allowClear
                className="w-full"
                size="large"
                loading={sellersLoading}
                placeholder={
                  sellersLoading ? t('stores.create.loadingSellers') : t('stores.create.selectSellerPh')
                }
                value={form.sellerId ? String(form.sellerId) : undefined}
                onChange={(v) =>
                  setForm((prev) => ({ ...prev, sellerId: v != null ? String(v) : '' }))
                }
                options={sellerSelectOptions}
                notFoundContent={sellersLoading ? <Spin size="small" /> : undefined}
              />
              <p className="text-xs text-slate-500 mt-1">{t('stores.create.sellerIdDesc')}</p>
              {sellersLoadError ? (
                <p className="text-xs text-amber-600 mt-1">{sellersLoadError}</p>
              ) : null}
              {!sellersLoading && sellers.length === 0 && !form.sellerId ? (
                <p className="text-xs text-amber-600 mt-1">{t('stores.create.noSellers')}</p>
              ) : null}
            </div>
          ) : null}

          <Input
            label={t('stores.create.storeName')}
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            minLength={2}
            className="md:col-span-2"
          />
          <Textarea
            label={t('stores.create.description')}
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="md:col-span-2"
          />
          <Input
            label={t('stores.create.phone')}
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('stores.create.address')}
            </label>
            <Select
              className="w-full"
              size="large"
              allowClear
              showSearch
              value={form.address || undefined}
              placeholder={t('stores.create.addressPlaceholder')}
              options={SYRIAN_GOVERNORATE_OPTIONS}
              onChange={(value) => setForm((prev) => ({ ...prev, address: value ?? '' }))}
            />
            <p className="mt-1 text-xs text-slate-500">{t('stores.create.addressDesc')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('stores.fields.storeType')}
            </label>
            <Select
              className="w-full"
              size="large"
              value={restaurantMode ? 'restaurant' : form.storeType}
              disabled={restaurantMode}
              options={STORE_TYPE_OPTIONS.map((value) => ({
                value,
                label: t(`stores.types.${value}`),
              }))}
              onChange={(storeType) => setForm((prev) => ({ ...prev, storeType }))}
            />
          </div>
          {isAdmin ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('stores.create.currency')}
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
              <p className="text-xs text-slate-500 mt-1">{t('stores.create.currencyDesc')}</p>
            </div>
          ) : null}
          <Input
            label={t('stores.create.exchangeRate')}
            name="exchangeRate"
            type="number"
            step="1"
            min="0"
            value={form.currency === 'syp' ? '1' : form.exchangeRate}
            onChange={handleChange}
            description={
              form.currency === 'syp'
                ? t('stores.create.exchangeRateSypDesc')
                : t('stores.create.exchangeRateDesc')
            }
            disabled={form.currency === 'syp'}
            required={form.currency === 'usd'}
          />

          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('stores.fields.scheduleTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{t('stores.fields.scheduleHint')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input
                label={t('stores.fields.startWorkingAt')}
                name="startWorkingAt"
                type="time"
                value={form.startWorkingAt}
                onChange={handleChange}
              />
              <Input
                label={t('stores.fields.endWorkingAt')}
                name="endWorkingAt"
                type="time"
                value={form.endWorkingAt}
                onChange={handleChange}
              />
              <Input
                label={t('stores.fields.preparationTime')}
                name="preparationTime"
                type="number"
                min="0"
                max="1440"
                step="1"
                value={form.preparationTime}
                onChange={handleChange}
                description={t('stores.fields.minutes')}
              />
            </div>
          </div>
          <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-900">
            <span className="font-medium">{t('stores.create.logo')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setLogoFile(file)
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900"
            />
            <span className="text-xs text-slate-500">{t('stores.create.logoHint')}</span>
          </label>
          {logoPreview ? (
            <div className="md:col-span-2">
              <img
                src={logoPreview}
                alt={t('stores.edit.logoAlt')}
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              />
            </div>
          ) : null}

          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <Input
              label={t('stores.create.lat')}
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={handleChange}
            />
            <Input
              label={t('stores.create.lng')}
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={handleChange}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2.5">
            <Switch
              checked={form.isActive}
              onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
            <span className="text-sm font-medium text-slate-800">{t('stores.create.active')}</span>
            <span className="text-xs text-slate-500">{t('stores.create.activeDesc')}</span>
          </div>

          <div className="md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setMapOpen((o) => !o)}>
              {mapOpen ? t('stores.create.hideMap') : t('stores.create.pickMap')}
            </Button>
            {mapOpen ? (
              <div className="mt-4">
                <LocationPickerMap latitude={mapLat} longitude={mapLng} onChange={setCoords} height={360} />
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2 flex-wrap">
            <Button as={Link} variant="ghost" to={restaurantMode ? '/restaurants' : '/stores'}>
              {t('stores.create.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? t('stores.create.submitting')
                : t(restaurantMode ? 'restaurants.create.submit' : 'stores.create.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
