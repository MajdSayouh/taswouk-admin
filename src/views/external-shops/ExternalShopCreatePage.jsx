import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, message } from 'antd'
import { useExternalShopsViewModel } from '../../viewmodels/useExternalShopsViewModel.js'
import * as externalShopService from '../../services/externalShopService.js'
import { buildExternalShopCreatePayload } from '../../models/ExternalShop.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ExternalShopEditorForm } from './ExternalShopEditorForm.jsx'

function emptyForm() {
  return {
    name: '',
    base_url: '',
    is_active: true,
    requires_vpn: false,
  }
}

export function ExternalShopCreatePage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { createShop, saving } = useExternalShopsViewModel({ fetchOnMount: false })
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    if (!String(form.name).trim()) {
      setError(t('externalShops.create.nameRequired'))
      return
    }
    if (!String(form.base_url).trim()) {
      setError(t('externalShops.create.baseUrlRequired'))
      return
    }
    setSubmitting(true)
    try {
      const created = await createShop(buildExternalShopCreatePayload(form))
      const shopId = created?.id
      if (logoFile && shopId != null && shopId !== '') {
        try {
          await externalShopService.uploadExternalShopLogo(shopId, logoFile)
        } catch (uploadErr) {
          message.warning(uploadErr?.message ?? t('externalShops.create.logoUploadErr'))
        }
      }
      message.success(t('externalShops.create.success'))
      navigate(shopId != null ? `/external-shops/${shopId}/edit` : '/external-shops')
    } catch (err) {
      setError(err?.message ?? t('externalShops.create.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const pending = saving || submitting

  return (
    <div className="space-y-6">
      <Link
        to="/external-shops"
        className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]"
      >
        {t('externalShops.create.back')}
      </Link>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Card title={t('externalShops.create.title')}>
        <p className="text-sm text-slate-600 mb-4">{t('externalShops.create.hint')}</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <ExternalShopEditorForm form={form} setForm={setForm} mode="create" disabled={pending} />

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">{t('externalShops.create.logo')}</p>
            <input
              type="file"
              accept="image/*"
              disabled={pending}
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.creating') : t('externalShops.create.submit')}
            </Button>
            <Button type="button" variant="secondary" as={Link} to="/external-shops">
              {t('externalShops.create.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
