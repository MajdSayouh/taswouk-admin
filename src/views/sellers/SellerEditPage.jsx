// Admin: PUT /api/accounts/admin/users/seller/{id} — UpdateSellerSchema (no GET-by-id; resolve from list).
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Alert, Spin, Switch, Popconfirm, message } from 'antd'
import * as adminService from '../../services/adminService.js'
import { mapSellerFromApi, buildSellerUpdatePayload } from '../../models/Seller.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useSellersViewModel } from '../../viewmodels/useSellersViewModel.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function SellerEditPage() {
  const { t } = useTranslation('pages')
  const { id } = useParams()
  const navigate = useNavigate()
  const { updateSeller, deleteSeller } = useSellersViewModel({ fetchOnMount: false })
  const [form, setForm] = useState({
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    is_active: true,
    is_verified: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const detailQuery = useQuery({
    queryKey: queryKeys.sellers.detail(id),
    queryFn: async () => {
      const list = await adminService.listSellers()
      const mapped = (Array.isArray(list) ? list : []).map(mapSellerFromApi)
      const hit = mapped.find((s) => String(s.id) === String(id))
      if (!hit) throw new Error('Seller not found')
      return hit
    },
    enabled: id != null && id !== '',
  })

  const row = detailQuery.data

  useEffect(() => {
    if (!row) return
    setForm({
      email: row.email ?? '',
      phone: row.phone ?? '',
      first_name: row.firstName ?? '',
      last_name: row.lastName ?? '',
      is_active: row.isActive,
      is_verified: row.isVerified,
    })
  }, [row])

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    const emailTrim = form.email.trim()
    if (!emailTrim) {
      setError(t('sellers.edit.emailRequired'))
      return
    }
    const phoneTrim = form.phone.trim()
    if (phoneTrim && phoneTrim.length !== 10) {
      setError(t('sellers.edit.phoneRule'))
      return
    }
    setSubmitting(true)
    try {
      await updateSeller(id, buildSellerUpdatePayload(form))
      message.success(t('sellers.edit.updated'))
      navigate('/sellers')
    } catch (err) {
      setError(err?.message ?? t('sellers.edit.updateErr'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSeller(id)
      message.success(t('sellers.edit.deleted'))
      navigate('/sellers')
    } catch (err) {
      message.error(err?.message ?? t('sellers.edit.deleteErr'))
    } finally {
      setDeleting(false)
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  const loadError = detailQuery.error?.message ?? null
  if (loadError || detailQuery.isError) {
    const notFound = loadError === 'Seller not found'
    return (
      <div className="space-y-4">
        <Alert
          type="error"
          title={notFound ? t('sellers.edit.loadErr') : loadError || t('sellers.edit.loadErr')}
          showIcon
        />
        <Button as={Link} variant="ghost" to="/sellers">
          {t('sellers.edit.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title={t('sellers.edit.title', { id })}>
        <p className="text-sm text-slate-600 mb-4">{t('sellers.edit.hint')}</p>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            label={t('sellers.edit.email')}
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
            className="md:col-span-2"
          />
          <Input
            label={t('sellers.edit.phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            description={t('sellers.edit.phoneDesc')}
          />
          <Input
            label={t('sellers.edit.firstName')}
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
          />
          <Input
            label={t('sellers.edit.lastName')}
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
          />

          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none md:col-span-2">
            <span className="text-sm font-medium text-slate-800">{t('sellers.edit.active')}</span>
            <Switch
              checked={form.is_active}
              onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            />
          </label>
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none md:col-span-2">
            <span className="text-sm font-medium text-slate-800">{t('sellers.edit.verified')}</span>
            <Switch
              checked={form.is_verified}
              onChange={(checked) => setForm((prev) => ({ ...prev, is_verified: checked }))}
            />
          </label>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button as={Link} variant="ghost" to="/sellers">
              {t('sellers.edit.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('sellers.edit.saving') : t('sellers.edit.submit')}
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <Popconfirm
            title={t('sellers.edit.deleteTitle')}
            description={t('sellers.edit.deleteDesc')}
            okText={t('shared.delete')}
            cancelText={t('shared.cancel')}
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={handleDelete}
          >
            <button
              type="button"
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              disabled={deleting}
            >
              {t('sellers.edit.deleteBtn')}
            </button>
          </Popconfirm>
        </div>
      </Card>
    </div>
  )
}
