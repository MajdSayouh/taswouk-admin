// Dashboard-wide warning while delivered external orders still have no price: the accounting
// system counts them at 0 until one is entered. Admin-only; hidden on the page that resolves it.
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Alert } from 'antd'
import { useAuthStore, isAdminRole } from '../../store/authStore.js'
import { usePendingExternalInvoicesCount } from '../../viewmodels/useExternalInvoicesViewModel.js'

export function ExternalInvoicesAlert() {
  const { t } = useTranslation('pages')
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const isAdmin = Boolean(user && isAdminRole(user.role))
  const count = usePendingExternalInvoicesCount({ enabled: isAdmin })

  if (!isAdmin || !count || location.pathname.startsWith('/external-invoices')) return null
  return (
    <Alert
      type="warning"
      showIcon
      className="mb-4"
      title={t('externalInvoices.pendingBanner', { count })}
      action={<Link to="/external-invoices">{t('externalInvoices.goToPage')}</Link>}
    />
  )
}
