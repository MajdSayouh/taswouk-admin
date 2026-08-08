// Shared mall fields for create/edit (MollCreateSchema / MollUpdateSchema).
import { useTranslation } from 'react-i18next'
import { Switch } from 'antd'
import { Input } from '../../components/ui/Input.jsx'
import { Textarea } from '../../components/ui/Textarea.jsx'

/**
 * @param {{
 *   form: Record<string, unknown>
 *   setForm: import('react').Dispatch<import('react').SetStateAction<Record<string, unknown>>>
 *   mode: 'create' | 'edit'
 *   disabled?: boolean
 * }} props
 */
export function MallEditorForm({ form, setForm, mode, disabled = false }) {
  const { t } = useTranslation('pages')

  function handleChange(ev) {
    const { name, value, type, checked } = ev.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

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
      <Input
        label={t('malls.editor.exchangeRate')}
        name="exchange_rate"
        type="number"
        min="0.000001"
        max="9999999999.999999"
        step="any"
        value={form.exchange_rate === '' || form.exchange_rate == null ? '' : String(form.exchange_rate)}
        onChange={handleChange}
        disabled={disabled}
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
      {mode === 'edit' ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">{t('malls.editor.active')}</span>
          <Switch
            checked={Boolean(form.is_active)}
            onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            disabled={disabled}
          />
        </div>
      ) : null}
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
