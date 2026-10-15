// Side drawer showing one delivery trip's route over the live drivers map.
import { useTranslation } from 'react-i18next'
import { Drawer } from 'antd'
import { AssignmentRouteMap } from './AssignmentRouteMap.jsx'

/**
 * @param {{ assignment: { assignment_id: number; order_number?: string } | null; onClose: () => void }} props
 */
export function RouteDrawer({ assignment, onClose }) {
  const { t } = useTranslation('pages')
  return (
    <Drawer
      open={Boolean(assignment)}
      onClose={onClose}
      size="large"
      destroyOnHidden
      title={assignment ? t('route.title', { number: assignment.order_number || assignment.assignment_id }) : null}
    >
      {assignment ? <AssignmentRouteMap assignmentId={assignment.assignment_id} height={420} /> : null}
    </Drawer>
  )
}
