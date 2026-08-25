// Small pending-count badge for the "Moderation" nav item — polled lightly (see
// useModerationPendingCount). Only meant to be rendered where the moderation nav item already
// appears (i.e. already admin-gated by dashboardNav.js), so no role check here.
import { Badge } from 'antd'
import { useModerationPendingCount } from '../../viewmodels/useProductModerationViewModel.js'

export function ModerationNavBadge() {
  const pendingCount = useModerationPendingCount()
  if (!pendingCount) return null
  return <Badge count={pendingCount} overflowCount={99} size="small" className="ms-1" />
}
