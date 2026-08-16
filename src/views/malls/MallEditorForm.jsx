// Shared mall fields for create/edit (MollCreateSchema / MollUpdateSchema).
import { useTranslation } from 'react-i18next'
import { Select, Switch } from 'antd'
import { Input } from '../../components/ui/Input.jsx'
import { Textarea } from '../../components/ui/Textarea.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { LocationPickerMap } from '../../components/maps/LocationPickerMap.jsx'

const MALL_CURRENCY_OPTIONS = [
  { value: 'usd', i18nKey: 'stores.currency.usd' },
  { value: 'syp', i18nKey: 'stores.currency.syp' },
]

/**
 * @param {{
 *   form: Record<string, unknown>
 *   setForm: import('react').Dispatch<import('react').SetStateAction<Record<string, unknown>>>
 *   mode: 'create' | 'edit'
 *   disabled?: boolean
 * }} props
 */
export function MallEditorForm({ form, setForm, mode, disabled = false, mapOpen, setMapOpen }) {
  const { t } = useTranslation('pages')

  function handleChange(ev) {
    const { name, value, type, checked } = ev.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function setCoords(lat, lng) {
    setForm((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }))
  }

  const latNum = form.latitude === '' || form.latitude == null ? null : Number(form.latitude)
  const lngNum = form.longitude === '' || form.longitude == null ? null : Number(form.longitude)
  const mapLat = latNum != null && !Number.isNaN(latNum) ? latNum : null
  const mapLng = lngNum != null && !Number.isNaN(lngNum) ? lngNum : null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input
        label={t('malls.editor.name')}
        name="name"
        value={String(form.name ?? '')}
        onChange={handleChange}
        required
        disabled={disabled}
      />
      <Input
        label={t('malls.editor.startWorkingAt')}
        name="start_working_at"
        type="time"
        value={String(form.start_working_at ?? '')}
        onChange={handleChange}
        required
        disabled={disabled}
        description={t('malls.editor.hoursHint')}
      />
      <Input
        label={t('malls.editor.endWorkingAt')}
        name="end_working_at"
        type="time"
        value={String(form.end_working_at ?? '')}
        onChange={handleChange}
        required
        disabled={disabled}
      />
      {mode === 'create' ? (
        <>
          <Input
            label={t('malls.editor.ownerEmail')}
            name="email"
            type="email"
            autoComplete="email"
            value={String(form.email ?? '')}
            onChange={handleChange}
            required
            disabled={disabled}
          />
          <Input
            label={t('malls.editor.ownerPassword')}
            name="password"
            type="password"
            autoComplete="new-password"
            value={String(form.password ?? '')}
            onChange={handleChange}
            required
            disabled={disabled}
            description={t('malls.editor.passwordHint')}
          />
        </>
      ) : null}
      <Input
        label={t('malls.editor.phone')}
        name="phone"
        type="tel"
        value={String(form.phone ?? '')}
        onChange={handleChange}
        disabled={disabled}
      />
      <Input
        label={t('malls.editor.contactEmail')}
        name="contact_email"
        type="email"
        value={String(form.contact_email ?? '')}
        onChange={handleChange}
        disabled={disabled}
      />
      <Input
        label={t('malls.editor.address')}
        name="address"
        value={String(form.address ?? '')}
        onChange={handleChange}
        disabled={disabled}
        className="md:col-span-2"
      />
      <Input
        label={t('malls.editor.minimumOrder')}
        name="minimum_order"
        type="number"
        min={0}
        value={form.minimum_order === '' || form.minimum_order == null ? '' : String(form.minimum_order)}
        onChange={handleChange}
        disabled={disabled}
      />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {t('malls.editor.currency')}
        </label>
        <Select
          className="w-full"
          size="large"
          disabled={disabled}
          value={String(form.currency ?? 'syp').toLowerCase()}
          options={MALL_CURRENCY_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.i18nKey),
          }))}
          onChange={(nextCurrency) =>
            setForm((prev) => ({
              ...prev,
              currency: nextCurrency,
              // A SYP mall always prices 1:1 — only a USD (or other foreign-currency) mall needs
              // a real exchange rate, matching how Stores handle this same choice.
              exchange_rate: nextCurrency === 'syp' ? '1' : prev.exchange_rate === '1' ? '' : prev.exchange_rate,
            }))
          }
        />
        <p className="text-xs text-slate-500 mt-1">{t('malls.editor.currencyHint')}</p>
      </div>
      <Input
        label={t('malls.editor.exchangeRate')}
        name="exchange_rate"
        type="number"
        min="0.000001"
        max="9999999999.999999"
        step="any"
        value={form.exchange_rate === '' || form.exchange_rate == null ? '' : String(form.exchange_rate)}
        onChange={handleChange}
        disabled={disabled || String(form.currency ?? 'syp').toLowerCase() === 'syp'}
        required={String(form.currency ?? 'syp').toLowerCase() === 'usd'}
        description={t('malls.editor.exchangeRateHint')}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">{t('malls.editor.priceMatch')}</span>
        <Switch
          checked={Boolean(form.price_match)}
          onChange={(checked) => setForm((prev) => ({ ...prev, price_match: checked }))}
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">{t('malls.editor.active')}</span>
        <Switch
          // POST /api/malls/ doesn't default this to true on its own — leaving it off screen at
          // create meant new malls stayed invisible on the public side until someone remembered
          // a separate "toggle active" step afterward.
          checked={form.is_active !== false}
          onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
          disabled={disabled}
        />
      </div>
      <Input
        label={t('malls.editor.lat')}
        name="latitude"
        type="number"
        step="any"
        value={String(form.latitude ?? '')}
        onChange={handleChange}
        disabled={disabled}
      />
      <Input
        label={t('malls.editor.lng')}
        name="longitude"
        type="number"
        step="any"
        value={String(form.longitude ?? '')}
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="md:col-span-2">
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => setMapOpen((o) => !o)}>
          {mapOpen ? t('malls.editor.hideMap') : t('malls.editor.pickMap')}
        </Button>
        {mapOpen ? (
          <div className="mt-4">
            <LocationPickerMap latitude={mapLat} longitude={mapLng} onChange={setCoords} height={360} />
          </div>
        ) : null}
      </div>
      <Textarea
        label={t('malls.editor.description')}
        name="description"
        value={String(form.description ?? '')}
        onChange={handleChange}
        disabled={disabled}
        className="md:col-span-2"
        rows={4}
      />
    </div>
  )
}
