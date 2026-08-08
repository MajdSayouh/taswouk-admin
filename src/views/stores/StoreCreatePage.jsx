// View: create store — admin uses POST /api/stores/admin/create-with-logo; seller uses POST /api/stores/my/create.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Select, Spin } from 'antd'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useAuthStore, isAdminRole, isSellerRole } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea.jsx'
import { LocationPickerMap } from '../../components/maps/LocationPickerMap.jsx'
import { useSellersViewModel } from '../../viewmodels/useSellersViewModel.js'

const STORE_CURRENCY_OPTIONS = [
  { value: 'usd', i18nKey: 'stores.currency.usd' },
  { value: 'syp', i18nKey: 'stores.currency.syp' },
]

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

function emptyForm() {
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
  }
}

function parseExchangeRateInput(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const rate = Number(trimmed)
  if (!Number.isInteger(rate)) return null
  return rate
}

export function StoreCreatePage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState(emptyForm)
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
          logo: logoFile || undefined,
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
          logo: logoFile || undefined,
        })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all() })
      navigate('/stores')
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

      <Card title={t('stores.create.title')}>
        <p className="text-sm text-slate-600 mb-4">
          {isAdmin ? t('stores.create.adminHint') : t('stores.create.sellerHint')}
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
          <Input
            label={t('stores.create.address')}
            name="address"
            value={form.address}
            onChange={handleChange}
            description={t('stores.create.addressDesc')}
          />
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
            <Button as={Link} variant="ghost" to="/stores">
              {t('stores.create.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('stores.create.submitting') : t('stores.create.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
