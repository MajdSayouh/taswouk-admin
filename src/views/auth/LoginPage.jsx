// View: sign-in form — `useAuthStore.login` → POST /api/accounts/auth/login; lists load with the stored JWT.
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert, Segmented } from 'antd'

export function LoginPage() {
  const { t, i18n: i18nInstance } = useTranslation()
  const langValue = i18nInstance.language?.startsWith('ar') ? 'ar' : 'en'
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const from = location.state?.from ?? { pathname: '/home' }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() && !phone.trim()) {
      setError(t('login.errorEmailOrPhone'))
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
      setError(err?.message ?? t('login.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="flex justify-end mb-4">
        <Segmented
          size="small"
          value={langValue}
          options={[
            { label: t('topbar.langArabic'), value: 'ar' },
            { label: t('topbar.langEnglish'), value: 'en' },
          ]}
          onChange={(v) => void i18nInstance.changeLanguage(v)}
        />
      </div>
      <Card title={t('login.title')}>
        {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('login.emailLabel')}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder={t('login.emailPlaceholder')}
          />
          <Input
            label={t('login.phoneLabel')}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            placeholder={t('login.phonePlaceholder')}
          />
          <Input
            label={t('login.passwordLabel')}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
