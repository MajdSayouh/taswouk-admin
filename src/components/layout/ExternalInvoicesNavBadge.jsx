// Pending-count badge for the "External invoices" nav item. Rendered only where that item
// appears, which dashboardNav.js already limits to admins.
import { Badge } from 'antd'
import { usePendingExternalInvoicesCount } from '../../viewmodels/useExternalInvoicesViewModel.js'

export function ExternalInvoicesNavBadge() {
  const count = usePendingExternalInvoicesCount()
  if (!count) return null
  return <Badge count={count} overflowCount={99} size="small" className="ms-1" />
}
