// Admin: POST /api/accounts/admin/users/seller — creates seller account (CreateSellerSchema).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from 'antd'
import { createSeller } from '../../services/adminService.js'
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
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
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
    setSubmitting(true)
    setCreated(null)
    try {
      const phoneTrim = form.phone.trim()
      const payload = {
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: phoneTrim.length ? phoneTrim : null,
      }
      const data = await createSeller(payload)
      setCreated(data)
      setForm(emptyForm())
    } catch (err) {
      setError(err?.message ?? 'Failed to create seller')
    } finally {
      setSubmitting(false)
    }
  }

  const storeCreateLink =
    created?.id != null ? `/admin/stores/create?seller_id=${encodeURIComponent(String(created.id))}` : ''

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" title={error} showIcon /> : null}

      {created?.id != null ? (
        <Alert
          type="success"
          showIcon
          title={`Seller created (ID: ${created.id}). You can create a store for this seller next.`}
          className="mb-2"
        />
      ) : null}

      <Card title="New seller">
        <p className="text-sm text-slate-600 mb-4">
          Admin-only: creates a seller account. The seller can sign in with email and password. Create a store
          for this seller from the Stores section (seller ID is required for admin store creation).
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            description="Optional; 10 digits when provided"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            description="Minimum 8 characters"
            className="md:col-span-2"
          />
          <Input label="First name" name="first_name" value={form.first_name} onChange={handleChange} />
          <Input label="Last name" name="last_name" value={form.last_name} onChange={handleChange} />

          <div className="md:col-span-2 flex justify-end gap-3 pt-2 flex-wrap">
            <Button as={Link} variant="ghost" to="/admin/sellers">
              Cancel
            </Button>
            {storeCreateLink ? (
              <Button as={Link} to={storeCreateLink}>
                Create store for this seller
              </Button>
            ) : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create seller'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
