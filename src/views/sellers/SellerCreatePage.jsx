// Admin: POST /api/accounts/admin/users/seller — creates seller account (CreateSellerSchema).
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert } from 'antd'
import { useSellersViewModel } from '../../viewmodels/useSellersViewModel.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const emptyForm = () => ({
  email: '',
  phone: '',
  password: '',
  first_name: '',
  last_name: '',
})

export function SellerCreatePage() {
  const { t } = useTranslation('pages')
  const { createSeller, saving } = useSellersViewModel({ fetchOnMount: false })
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  /** @type {{ id: number } | null} */
  const [created, setCreated] = useState(null)

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)
    setCreated(null)
    const phoneTrim = form.phone.trim()
    if (phoneTrim && phoneTrim.length !== 10) {
      setError(t('sellers.create.phoneErr'))
      return
    }
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: phoneTrim.length ? phoneTrim : null,
      }
      const data = await createSeller(payload)
      setCreated({ id: data.id })
      setForm(emptyForm())
    } catch (err) {
      setError(err?.message ?? t('sellers.create.failed'))
    }
  }

  const storeCreateLink =
    created?.id != null ? `/stores/create?seller_id=${encodeURIComponent(String(created.id))}` : ''

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" title={error} showIcon /> : null}

      {created?.id != null ? (
        <Alert
          type="success"
          showIcon
          title={t('sellers.create.successTitle', { id: created.id })}
          className="mb-2"
        />
      ) : null}

      <Card title={t('sellers.create.title')}>
        <p className="text-sm text-slate-600 mb-4">{t('sellers.create.hint')}</p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            label={t('sellers.create.email')}
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label={t('sellers.create.phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            description={t('sellers.create.phoneDesc')}
          />
          <Input
            label={t('sellers.create.password')}
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            description={t('sellers.create.passwordDesc')}
            className="md:col-span-2"
          />
          <Input
            label={t('sellers.create.firstName')}
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
          />
          <Input
            label={t('sellers.create.lastName')}
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
          />

          <div className="md:col-span-2 flex justify-end gap-3 pt-2 flex-wrap">
            <Button as={Link} variant="ghost" to="/sellers">
              {t('sellers.create.cancel')}
            </Button>
            {storeCreateLink ? (
              <Button as={Link} to={storeCreateLink}>
                {t('sellers.create.createStore')}
              </Button>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? t('sellers.create.submitting') : t('sellers.create.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
