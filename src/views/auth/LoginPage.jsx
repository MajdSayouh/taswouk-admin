// View: sign-in form — calls `useAuthStore.login`, which hits POST /api/accounts/login then GET /api/accounts/profile.
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from 'antd'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const from = location.state?.from ?? { pathname: '/admin/dashboard' }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() && !phone.trim()) {
      setError('Enter your email or phone number.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await login({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card title="Sign in">
        {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email (optional if you use phone)"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="store.owner@example.com"
          />
          <Input
            label="Phone (optional if you use email)"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            placeholder="+9665xxxxxxxx"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
