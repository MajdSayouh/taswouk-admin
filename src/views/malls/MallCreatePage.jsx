// Admin: POST /api/malls/ — create mall + owner account.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, message } from 'antd'
import { useMallsViewModel } from '../../viewmodels/useMallsViewModel.js'
import * as mallService from '../../services/mallService.js'
import {
  buildMallCreatePayload,
  isValidMallExchangeRateInput,
  mallExchangeRateForApi,
} from '../../models/Mall.js'
import { Card } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { MallEditorForm } from './MallEditorForm.jsx'

function emptyForm() {
  return {
    name: '',
    description: '',
    start_working_at: '09:00',
    end_working_at: '22:00',
    email: '',
    password: '',
    phone: '',
    address: '',
    contact_email: '',
    minimum_order: 0,
    price_match: false,
    exchange_rate: '',
    currency: 'syp',
    is_active: true,
  }
}

export function MallCreatePage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { createMall, saving } = useMallsViewModel({ fetchOnMount: false })
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    if (!String(form.name).trim()) {
      setError(t('malls.create.nameRequired'))
      return
    }
    if (!String(form.email).trim()) {
      setError(t('malls.create.emailRequired'))
      return
    }
    if (String(form.password).length < 8) {
      setError(t('malls.create.passwordRule'))
      return
    }
    if (!isValidMallExchangeRateInput(form.exchange_rate)) {
      setError(t('malls.editor.exchangeRateError'))
      return
    }
    setSubmitting(true)
    try {
      const created = await createMall(buildMallCreatePayload(form))
      const exchangeRate = mallExchangeRateForApi(form.exchange_rate)
      if (created.id && exchangeRate != null) {
        try {
          await mallService.setMallExchangeRate(created.id, exchangeRate)
        } catch (rateErr) {
          message.warning(rateErr?.message ?? t('malls.create.exchangeRateErr'))
        }
      }
      // Currency isn't part of MollCreateSchema (same as Stores) — set it with a follow-up PUT
      // so picking USD at creation actually persists instead of silently reverting to whatever
      // the backend defaults new malls to until someone visits Edit.
      if (created.id && form.currency) {
        try {
          await mallService.updateMall(created.id, { currency: String(form.currency).toUpperCase() })
        } catch (currencyErr) {
          message.warning(currencyErr?.message ?? t('malls.create.currencyErr'))
        }
      }
      if (logoFile && created.id) {
        try {
          await mallService.uploadMallLogo(created.id, logoFile)
        } catch (uploadErr) {
          message.warning(uploadErr?.message ?? t('malls.create.logoUploadErr'))
        }
      }
      message.success(t('malls.create.success'))
      navigate(`/malls/${created.id}/edit`)
    } catch (err) {
      setError(err?.message ?? t('malls.create.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const pending = saving || submitting

  return (
    <div className="space-y-6">
      <Link to="/malls" className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]">
        {t('malls.create.back')}
      </Link>
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Card title={t('malls.create.title')}>
        <p className="text-sm text-slate-600 mb-4">{t('malls.create.hint')}</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <MallEditorForm form={form} setForm={setForm} mode="create" disabled={pending} />

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">{t('malls.create.logo')}</p>
            <input
              type="file"
              accept="image/*"
              disabled={pending}
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.creating') : t('malls.create.submit')}
            </Button>
            <Button type="button" variant="secondary" as={Link} to="/malls">
              {t('malls.create.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
