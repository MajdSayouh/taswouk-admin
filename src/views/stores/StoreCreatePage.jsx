// View: create store — admin uses POST /api/stores/admin/create; seller uses POST /api/stores/my/create.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Spin } from 'antd'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { useAuthStore, isAdminRole, isSellerRole } from '../../store/authStore.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LocationPickerMap } from '../../components/maps/LocationPickerMap.jsx'

function emptyForm() {
  return {
    sellerId: '',
    name: '',
    description: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
  }
}

export function StoreCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))

  const isAdmin = useMemo(() => (user ? isAdminRole(user.role) : false), [user])
  const isSeller = useMemo(() => (user ? isSellerRole(user.role) : false), [user])
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : ''), [logoFile])

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  useEffect(() => {
    const q = searchParams.get('seller_id')
    if (q != null && String(q).trim() !== '') {
      setForm((prev) => ({ ...prev, sellerId: String(q).trim() }))
    }
  }, [searchParams])

  function handleChange(ev) {
    const { name, value } = ev.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function setCoords(lat, lng) {
    setForm((prev) => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
    }))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setError(null)

    const nameTrim = form.name.trim()
    if (!nameTrim || nameTrim.length < 2) {
      setError('Store name must be at least 2 characters.')
      return
    }

    if (isAdmin) {
      const sid = Number(form.sellerId)
      if (!Number.isFinite(sid) || sid <= 0) {
        setError('Enter a valid seller ID (create a seller first if needed).')
        return
      }
    }

    if (!isAdmin && !isSeller) {
      setError('Only admin or seller accounts can create stores.')
      return
    }

    const desc = form.description.trim() || null
    const phone = form.phone.trim() || null
    const address = form.address.trim() || null
    const lat =
      form.latitude === '' || form.latitude == null ? null : Number(form.latitude)
    const lng =
      form.longitude === '' || form.longitude == null ? null : Number(form.longitude)

    setSubmitting(true)
    try {
      if (isAdmin) {
        await storeService.adminCreateStore({
          seller_id: Number(form.sellerId),
          name: nameTrim,
          description: desc,
          phone,
          address,
          latitude: lat != null && !Number.isNaN(lat) ? lat : null,
          longitude: lng != null && !Number.isNaN(lng) ? lng : null,
          logo: logoFile || undefined,
        })
      } else {
        await storeService.sellerCreateStore({
          name: nameTrim,
          description: desc,
          phone,
          address,
          latitude: lat != null && !Number.isNaN(lat) ? lat : null,
          longitude: lng != null && !Number.isNaN(lng) ? lng : null,
          logo: logoFile || undefined,
        })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all() })
      navigate('/admin/stores')
    } catch (err) {
      setError(err?.message ?? 'Failed to create store')
    } finally {
      setSubmitting(false)
    }
  }

  const latNum = form.latitude === '' ? null : Number(form.latitude)
  const lngNum = form.longitude === '' ? null : Number(form.longitude)
  const mapLat = latNum != null && !Number.isNaN(latNum) ? latNum : null
  const mapLng = lngNum != null && !Number.isNaN(lngNum) ? lngNum : null

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAdmin && !isSeller) {
    return (
      <div className="space-y-4">
        <Alert
          type="warning"
          title="This page is available to admin or seller accounts only."
          showIcon
        />
        <Button as={Link} variant="ghost" to="/admin/dashboard">
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title="New store">
        <p className="text-sm text-slate-600 mb-4">
          {isAdmin
            ? 'Admin: creates a store for an existing seller. Use the seller’s user ID (shown after creating a seller).'
            : 'Creates your store; you can manage products after it appears in the list.'}
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {isAdmin ? (
            <Input
              label="Seller ID"
              name="sellerId"
              type="number"
              min={1}
              step={1}
              value={form.sellerId}
              onChange={handleChange}
              required
              description="User id of the seller (from Create seller)"
              className="md:col-span-2"
            />
          ) : null}

          <Input
            label="Store name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            minLength={2}
            className="md:col-span-2"
          />
          <Input
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            className="md:col-span-2"
          />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
          <Input
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            description="Max 50 characters per API"
          />
          <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-900">
            <span className="font-medium">Store logo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setLogoFile(file)
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900"
            />
            <span className="text-xs text-slate-500">Optional logo image.</span>
          </label>
          {logoPreview ? (
            <div className="md:col-span-2">
              <img
                src={logoPreview}
                alt="Store logo preview"
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              />
            </div>
          ) : null}

          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <Input
              label="Latitude"
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={handleChange}
            />
            <Input
              label="Longitude"
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={handleChange}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setMapOpen((o) => !o)}>
              {mapOpen ? 'Hide map' : 'Pick location on map'}
            </Button>
            {mapOpen ? (
              <div className="mt-4">
                <LocationPickerMap latitude={mapLat} longitude={mapLng} onChange={setCoords} height={360} />
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2 flex-wrap">
            <Button as={Link} variant="ghost" to="/admin/stores">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create store'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
