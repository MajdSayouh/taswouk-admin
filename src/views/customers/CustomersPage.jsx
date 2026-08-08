// View layer: customers screen with a simple list of mock customers.
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { createCustomer } from '../../models/Customer'

const mockCustomers = [
  createCustomer({
    id: 'c-1',
    name: 'Fatima Al-Sayed',
    email: 'fatima@example.com',
    phone: '+966 50 123 4567',
    city: 'Riyadh',
    country: 'Saudi Arabia',
  }),
  createCustomer({
    id: 'c-2',
    name: 'Omar Khalid',
    email: 'omar@example.com',
    phone: '+966 55 234 5678',
    city: 'Jeddah',
    country: 'Saudi Arabia',
  }),
  createCustomer({
    id: 'c-3',
    name: 'Laila Nasser',
    email: 'laila@example.com',
    phone: '+966 54 345 6789',
    city: 'Dammam',
    country: 'Saudi Arabia',
  }),
]

export function CustomersPage() {
  const { t } = useTranslation('pages')
  return (
    <div className="space-y-6">
      <Card title={t('customers.title', { count: mockCustomers.length })}>
        <div className="space-y-3 text-sm">
          {mockCustomers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between border-b border-slate-200 pb-2 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-slate-900">{customer.name}</p>
                <p className="text-xs text-slate-500">{customer.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">{customer.phone}</p>
                <p className="text-xs text-slate-500">
                  {customer.city}, {customer.country}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

