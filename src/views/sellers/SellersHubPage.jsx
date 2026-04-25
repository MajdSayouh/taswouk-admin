// Admin landing for the Sellers section — links to create flow.
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function SellersHubPage() {
  return (
    <div className="space-y-6">
      <Card title="Sellers">
        <p className="text-sm text-slate-600 mb-4">
          Create seller accounts here. Sellers can sign in and create their own stores, or an admin can create
          stores for them.
        </p>
        <Button as={Link} to="/admin/sellers/create">
          Create seller
        </Button>
      </Card>
    </div>
  )
}
