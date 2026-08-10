// View: create progressive coupon — POST /api/orders/progressive-coupons/admin/coupons
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { Alert, InputNumber, Switch, message } from 'antd'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useProgressiveCouponsViewModel } from '../../viewmodels/useProgressiveCouponsViewModel.js'

function emptyTier() {
  return { key: `t_${Math.random().toString(36).slice(2, 9)}`, min_amount: '', discount_amount: '' }
}

export function ProgressiveCouponCreatePage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { createMutation, updateStatusMutation } = useProgressiveCouponsViewModel({
    fetchOnMount: false,
  })
  const [code, setCode] = useState('')
  const [tiers, setTiers] = useState([emptyTier()])
  const [isActive, setIsActive] = useState(true)
  const [localError, setLocalError] = useState(/** @type {string | null} */ (null))

  function updateTier(key, patch) {
    setTiers((prev) => prev.map((tier) => (tier.key === key ? { ...tier, ...patch } : tier)))
  }

  function addTier() {
    setTiers((prev) => [...prev, emptyTier()])
  }

  function removeTier(key) {
    setTiers((prev) => (prev.length > 1 ? prev.filter((tier) => tier.key !== key) : prev))
  }

  function buildPayload() {
    const trimmedCode = code.trim()
    if (trimmedCode.length < 2) return { error: t('progressiveCoupons.validation.code') }

    const parsedTiers = []
    for (const tier of tiers) {
      const minAmount = Number(tier.min_amount)
      const discountAmount = Number(tier.discount_amount)
      if (!Number.isFinite(minAmount) || minAmount < 0) {
        return { error: t('progressiveCoupons.validation.minAmount') }
      }
      if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
        return { error: t('progressiveCoupons.validation.discountAmount') }
      }
      parsedTiers.push({ minAmount, discountAmount })
    }
    for (let i = 1; i < parsedTiers.length; i++) {
      if (parsedTiers[i].minAmount <= parsedTiers[i - 1].minAmount) {
        return { error: t('progressiveCoupons.validation.tierOrder') }
      }
    }

    return {
      payload: {
        code: trimmedCode,
        tiers: parsedTiers.map((tier, i) => ({
          tier_number: i + 1,
          min_amount: tier.minAmount,
          discount_amount: tier.discountAmount,
        })),
      },
    }
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setLocalError(null)
    const { error, payload } = buildPayload()
    if (error) {
      setLocalError(error)
      return
    }
    try {
      const created = await createMutation.mutateAsync(payload)
      // CreateProgressiveCouponSchema only accepts {code, tiers} — is_active isn't part of it, so
      // it can't be set in the create call itself (unlike Stores/Malls/Mall Catalog). Set it as a
      // best-effort follow-up PATCH instead, same pattern already used for mall exchange
      // rates/logos. Only bother if the admin turned it off — a freshly created coupon likely
      // already defaults to active, and this call existing at all closes the same
      // silent-inactive gap those other resources had, in case the default is actually off.
      const createdId = created?.id ?? created?.coupon_id
      if (!isActive && createdId != null) {
        try {
          await updateStatusMutation.mutateAsync({
            couponId: createdId,
            payload: { is_active: false },
          })
        } catch (statusErr) {
          message.warning(statusErr?.message ?? t('progressiveCoupons.create.statusErr'))
        }
      }
      message.success(t('progressiveCoupons.create.success'))
      navigate('/progressive-coupons')
    } catch (e) {
      setLocalError(e?.message ?? t('progressiveCoupons.create.failed'))
    }
  }

  const pending = createMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/progressive-coupons"
          className="text-sm font-medium text-slate-600 hover:text-[#FF7D29]"
        >
          {t('progressiveCoupons.create.back')}
        </Link>
      </div>

      <Card>
        <h1 className="text-lg font-semibold text-slate-900 mb-4">
          {t('progressiveCoupons.create.title')}
        </h1>
        {localError && <Alert type="error" showIcon className="mb-4" message={localError} />}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label={t('progressiveCoupons.editor.code')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={pending}
            maxLength={50}
            required
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                {t('progressiveCoupons.editor.tiers')}
              </label>
              <Button type="button" variant="ghost" onClick={addTier} disabled={pending}>
                {t('progressiveCoupons.editor.addTier')}
              </Button>
            </div>
            <p className="text-xs text-slate-500">{t('progressiveCoupons.editor.tiersHint')}</p>

            <div className="space-y-2">
              {tiers.map((tier, index) => (
                <div
                  key={tier.key}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="w-16 shrink-0">
                    <span className="block text-xs font-medium text-slate-600 mb-1">
                      {t('progressiveCoupons.editor.tierNumber')}
                    </span>
                    <span className="flex h-9 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-sm font-medium text-slate-700">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('progressiveCoupons.editor.minAmount')}
                    </label>
                    <InputNumber
                      min={0}
                      step={0.01}
                      className="w-full"
                      disabled={pending}
                      value={tier.min_amount === '' ? null : Number(tier.min_amount)}
                      onChange={(v) =>
                        updateTier(tier.key, { min_amount: v != null ? String(v) : '' })
                      }
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('progressiveCoupons.editor.discountAmount')}
                    </label>
                    <InputNumber
                      min={0.01}
                      step={0.01}
                      className="w-full"
                      disabled={pending}
                      value={tier.discount_amount === '' ? null : Number(tier.discount_amount)}
                      onChange={(v) =>
                        updateTier(tier.key, { discount_amount: v != null ? String(v) : '' })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!text-rose-600 hover:!bg-rose-50"
                    disabled={pending || tiers.length <= 1}
                    onClick={() => removeTier(tier.key)}
                  >
                    {t('progressiveCoupons.editor.removeTier')}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Switch checked={isActive} onChange={setIsActive} disabled={pending} />
            <span className="text-sm font-medium text-slate-700">
              {t('progressiveCoupons.editor.active')}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t('shared.creating') : t('progressiveCoupons.create.submit')}
            </Button>
            <Button type="button" variant="secondary" as={Link} to="/progressive-coupons">
              {t('progressiveCoupons.create.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
