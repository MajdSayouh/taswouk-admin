import { useTranslation } from 'react-i18next'
import { Switch } from 'antd'
import { Input } from '../../components/ui/Input.jsx'

/**
 * @param {{
 *   form: Record<string, unknown>
 *   setForm: import('react').Dispatch<import('react').SetStateAction<Record<string, unknown>>>
 *   mode: 'create' | 'edit'
 *   disabled?: boolean
 * }} props
 */
export function ExternalShopEditorForm({ form, setForm, mode, disabled = false }) {
  const { t } = useTranslation('pages')

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input
        label={t('externalShops.editor.name')}
        name="name"
        value={String(form.name ?? '')}
        onChange={handleChange}
        required
        disabled={disabled}
        className="md:col-span-2"
      />
      <Input
        label={t('externalShops.editor.baseUrl')}
        name="base_url"
        type="url"
        value={String(form.base_url ?? '')}
        onChange={handleChange}
        required
        disabled={disabled}
        description={t('externalShops.editor.baseUrlHint')}
        className="md:col-span-2"
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">{t('externalShops.editor.requiresVpn')}</span>
        <Switch
          checked={Boolean(form.requires_vpn)}
          onChange={(checked) => setForm((prev) => ({ ...prev, requires_vpn: checked }))}
          disabled={disabled}
        />
      </div>
      {mode === 'edit' || mode === 'create' ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">{t('externalShops.editor.active')}</span>
          <Switch
            checked={Boolean(form.is_active)}
            onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  )
}
