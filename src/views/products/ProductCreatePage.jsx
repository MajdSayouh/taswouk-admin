// View layer: create item (POST /api/items) — form fields match ItemCreateSchema from the API.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from 'antd'

export function ProductCreatePage() {
  const navigate = useNavigate()
  const { createProduct, creating, error } = useProductsViewModel({ fetchOnMount: false })

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
  })

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      await createProduct({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        quantity: form.quantity === '' ? 0 : Number(form.quantity),
      })
      navigate('/admin/products')
    } catch {
      // Error state is held on the ViewModel; optional inline feedback via Alert below.
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert type="error" message={error} showIcon />
      ) : null}

      <Card title="Create product">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Product name"
            required
            className="md:col-span-2"
          />
          <Input
            label="Description (optional)"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Short description"
            className="md:col-span-2"
          />
          <Input
            label="Price (SAR)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={handleChange}
            required
          />
          <Input
            label="Quantity in stock"
            name="quantity"
            type="number"
            min="0"
            value={form.quantity}
            onChange={handleChange}
            placeholder="0"
          />

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/admin/products')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create product'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
