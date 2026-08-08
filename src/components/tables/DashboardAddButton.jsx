// Primary “add / create” actions in list card headers — same size and weight everywhere.
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button.jsx'

const className =
  'inline-flex min-h-9 items-center justify-center gap-1.5 px-4 py-2 font-medium whitespace-nowrap'

/**
 * @param {{ to: string, children: React.ReactNode }} props
 */
export function DashboardAddLinkButton({ to, children }) {
  return (
    <Button as={Link} to={to} variant="primary" className={className}>
      {children}
    </Button>
  )
}

/**
 * @param {{ onClick: () => void, disabled?: boolean, children: React.ReactNode }} props
 */
export function DashboardAddTriggerButton({ onClick, disabled, children }) {
  return (
    <Button type="button" variant="primary" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </Button>
  )
}
