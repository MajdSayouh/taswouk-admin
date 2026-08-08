// Shared fields for create / edit coupon (POST / PATCH /api/orders/coupons).
import { useTranslation } from 'react-i18next'
import { InputNumber, Switch } from 'antd'
import { Input } from '../../components/ui/Input'

/**
 * @param {{
 *   form: { code: string, name: string, discountPercent: string, maxUses: string, expiresAtLocal: string, isActive: boolean }
 *   setForm: import('react').Dispatch<import('react').SetStateAction<any>>
 *   disabled?: boolean
 * }} props
 */
export function CouponEditorForm({ form, setForm, disabled }) {
  const { t } = useTranslation('pages')

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Input
        name="code"
        label={t('coupons.editor.code')}
        value={form.code}
        onChange={handleChange}
        disabled={disabled}
        autoComplete="off"
        maxLength={50}
      />
      <Input
        name="name"
        label={t('coupons.editor.name')}
        value={form.name}
        onChange={handleChange}
        disabled={disabled}
        maxLength={150}
      />
      <label className="flex flex-col gap-1 text-sm text-slate-900">
        <span className="font-medium">{t('coupons.editor.discountPercent')}</span>
        <InputNumber
          className="w-full max-w-xs"
          min={0.01}
          max={100}
          step={0.5}
          value={form.discountPercent === '' ? null : Number(form.discountPercent)}
          onChange={(v) => setForm((prev) => ({ ...prev, discountPercent: v == null ? '' : String(v) }))}
          disabled={disabled}
        />
        <span className="text-xs text-slate-500">{t('coupons.editor.discountHint')}</span>
      </label>
      <Input
        name="maxUses"
        label={t('coupons.editor.maxUses')}
        description={t('coupons.editor.maxUsesHint')}
        value={form.maxUses}
        onChange={handleChange}
        disabled={disabled}
        inputMode="numeric"
      />
      <Input
        name="expiresAtLocal"
        type="datetime-local"
        label={t('coupons.editor.expiresAt')}
        description={t('coupons.editor.expiresHint')}
        value={form.expiresAtLocal}
        onChange={handleChange}
        disabled={disabled}
      />
      <label className="flex items-center gap-2 text-sm text-slate-900">
        <Switch
          checked={form.isActive}
          onChange={(v) => setForm((prev) => ({ ...prev, isActive: v }))}
          disabled={disabled}
        />
        <span className="font-medium">{t('coupons.editor.active')}</span>
      </label>
    </div>
  )
}
