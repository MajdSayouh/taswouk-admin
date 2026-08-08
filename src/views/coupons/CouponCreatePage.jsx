// View: create coupon — POST /api/orders/coupons
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { Alert, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useCouponsViewModel } from '../../viewmodels/useCouponsViewModel.js'
import { CouponEditorForm } from './CouponEditorForm.jsx'
import {
  emptyCouponForm,
  formToApiPayload,
  validateCouponForm,
} from './couponFormUtils.js'

export function CouponCreatePage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { createMutation } = useCouponsViewModel({ fetchOnMount: false })
  const [form, setForm] = useState(emptyCouponForm)
  const [localError, setLocalError] = useState(/** @type {string | null} */ (null))

  async function handleSubmit(ev) {
    ev.preventDefault()
    setLocalError(null)
    const err = validateCouponForm(form, (k) => t(`coupons.validation.${k}`))
    if (err) {
      setLocalError(err)
      return
    }
    const payload = formToApiPayload(form)
    try {
      await createMutation.mutateAsync(payload)
      message.success(t('coupons.create.success'))
      navigate('/coupons')
    } catch (e) {
      setLocalError(e?.message ?? t('coupons.create.failed'))
    }
  }

  const pending = createMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/coupons"
          className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]"
        >
          {t('coupons.create.back')}
        </Link>
      </div>

      <Card>
        <h1 className="text-lg font-semibold text-slate-900 mb-4">{t('coupons.create.title')}</h1>
        {localError && (
          <Alert type="error" showIcon className="mb-4" message={localError} />
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <CouponEditorForm form={form} setForm={setForm} disabled={pending} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.creating') : t('coupons.create.submit')}
            </Button>
            <Button type="button" variant="secondary" as={Link} to="/coupons">
              {t('coupons.create.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
