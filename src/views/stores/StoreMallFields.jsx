// View: the fields only a mall store uses — shared by the store create and edit pages.
import { useTranslation } from 'react-i18next'
import { Switch } from 'antd'
import { Input } from '../../components/ui/Input'

/**
 * The backend stores these on every store type but acts on them only for a
 * mall (`minimum_order` is enforced at checkout), so they are shown, and sent,
 * only while the selected type is `mall`.
 *
 * @param {{
 *   form: { minimumOrder: string, contactEmail: string, priceMatch: boolean }
 *   onChange: (ev: import('react').ChangeEvent<HTMLInputElement>) => void
 *   onPriceMatchChange: (checked: boolean) => void
 * }} props
 */
export function StoreMallFields({ form, onChange, onPriceMatchChange }) {
  const { t } = useTranslation('pages')
  return (
    <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{t('stores.fields.mallTitle')}</h3>
      <p className="mt-1 text-xs text-slate-500">{t('stores.fields.mallHint')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input
          label={t('stores.fields.minimumOrder')}
          name="minimumOrder"
          type="number"
          min="0"
          step="1"
          value={form.minimumOrder}
          onChange={onChange}
          description={t('stores.fields.minimumOrderDesc')}
        />
        <Input
          label={t('stores.fields.contactEmail')}
          name="contactEmail"
          type="email"
          maxLength={254}
          value={form.contactEmail}
          onChange={onChange}
        />
        <label className="sm:col-span-2 inline-flex items-center gap-3 cursor-pointer select-none">
          <Switch checked={form.priceMatch} onChange={onPriceMatchChange} />
          <span className="text-sm font-medium text-slate-800">{t('stores.fields.priceMatch')}</span>
          <span className="text-xs text-slate-500">{t('stores.fields.priceMatchDesc')}</span>
        </label>
      </div>
    </div>
  )
}
