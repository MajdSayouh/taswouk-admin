// View: the store's «نسبة العقد» (contract percent) — shared by the store create and edit pages.
import { useTranslation } from 'react-i18next'
import { Input } from '../../components/ui/Input'
import { parseContractPercentInput } from './contractPercent.js'

/** The example store price the hint raises (currency-free: it reads the same for USD and SYP stores). */
const EXAMPLE_STORE_PRICE = 1000

/**
 * Admin-only. The backend adds this percent to every price the store's customers
 * see, for all of its products at once; the seller keeps seeing their own prices.
 *
 * @param {{
 *   value: string
 *   onChange: (ev: import('react').ChangeEvent<HTMLInputElement>) => void
 * }} props
 */
export function StoreContractField({ value, onChange }) {
  const { t } = useTranslation('pages')
  const percent = parseContractPercentInput(value)
  const format = (amount) => amount.toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50/70 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{t('stores.fields.contractTitle')}</h3>
      <p className="mt-1 text-xs text-slate-600">{t('stores.fields.contractHint')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-end">
        <Input
          label={t('stores.fields.contractPercent')}
          name="contractPercent"
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.01"
          placeholder="0"
          value={value}
          onChange={onChange}
          error={percent == null ? t('stores.validation.contractPercent') : undefined}
        />
        {percent != null ? (
          <p className="text-sm text-slate-700 sm:pb-2">
            {t('stores.fields.contractExample', {
              store: format(EXAMPLE_STORE_PRICE),
              customer: format(EXAMPLE_STORE_PRICE * (1 + percent / 100)),
            })}
          </p>
        ) : null}
      </div>
    </div>
  )
}
