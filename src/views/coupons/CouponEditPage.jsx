// View: edit coupon — PATCH /api/orders/coupons/{id}; row resolved from list cache (no GET-by-id).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Alert, Spin, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useCouponsViewModel } from '../../viewmodels/useCouponsViewModel.js'
import { CouponEditorForm } from './CouponEditorForm.jsx'
import {
  couponRowToForm,
  formToApiPayload,
  validateCouponForm,
} from './couponFormUtils.js'

function CouponEditFormSection({ row, couponId, updateMutation, navigate, t }) {
  const [form, setForm] = useState(() => couponRowToForm(row))
  const [localError, setLocalError] = useState(/** @type {string | null} */ (null))
  const pending = updateMutation.isPending

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
      await updateMutation.mutateAsync({ couponId, payload })
      message.success(t('coupons.edit.success'))
      navigate('/coupons')
    } catch (e) {
      setLocalError(e?.message ?? t('coupons.edit.failed'))
    }
  }

  return (
    <>
      {localError && (
        <Alert type="error" showIcon className="mb-4" message={localError} />
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <CouponEditorForm form={form} setForm={setForm} disabled={pending} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? t('shared.saving') : t('coupons.edit.submit')}
          </Button>
          <Button type="button" variant="secondary" as={Link} to="/coupons">
            {t('coupons.edit.cancel')}
          </Button>
        </div>
      </form>
    </>
  )
}

export function CouponEditPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const navigate = useNavigate()
  const { coupons, loading, error, isFetched, updateMutation } = useCouponsViewModel({
    fetchOnMount: true,
  })

  const row = useMemo(
    () => coupons.find((c) => String(c.id) === String(id)),
    [coupons, id],
  )

  const notInList = isFetched && !loading && id != null && !row

  if (loading && !row) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert type="error" message={error} />
        <Button type="button" variant="secondary" as={Link} to="/coupons">
          {t('coupons.edit.back')}
        </Button>
      </div>
    )
  }

  if (notInList) {
    return (
      <div className="space-y-4">
        <Alert type="warning" message={t('coupons.edit.notFound')} />
        <Button type="button" variant="secondary" as={Link} to="/coupons">
          {t('coupons.edit.back')}
        </Button>
      </div>
    )
  }

  if (!row || id == null) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/coupons"
          className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]"
        >
          {t('coupons.edit.back')}
        </Link>
      </div>

      <Card>
        <h1 className="text-lg font-semibold text-slate-900 mb-4">
          {t('coupons.edit.title', { id })}
        </h1>
        <CouponEditFormSection
          key={row.id}
          row={row}
          couponId={id}
          updateMutation={updateMutation}
          navigate={navigate}
          t={t}
        />
      </Card>
    </div>
  )
}
