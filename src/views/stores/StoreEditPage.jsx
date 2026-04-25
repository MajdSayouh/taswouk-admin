// View: edit store — PUT /api/stores/{id} with { name, phone, address, description, latitude, longitude, logo }. Map for lat/lng.
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Alert, Spin } from 'antd'
import * as storeService from '../../services/storeService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { resolvePublicMediaUrl } from '../../utils/mediaUrl.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LocationPickerMap } from '../../components/maps/LocationPickerMap.jsx'

export function StoreEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mapOpen, setMapOpen] = useState(false)

  const storeQuery = useQuery({
    queryKey: queryKeys.stores.detail(id),
    queryFn: () => storeService.getStore(id),
    enabled: id != null && id !== '',
  })

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    description: '',
    latitude: '',
    longitude: '',
  })
  const [logoFile, setLogoFile] = useState(/** @type {File | null} */ (null))
  const [existingLogo, setExistingLogo] = useState('')

  const raw = storeQuery.data

  useEffect(() => {
    if (!raw) return
    setForm({
      name: raw?.name ?? '',
      phone: raw?.phone ?? '',
      address: raw?.address ?? '',
      description: raw?.description ?? '',
      latitude: raw?.latitude != null ? String(raw.latitude) : '',
      longitude: raw?.longitude != null ? String(raw.longitude) : '',
    })
    setExistingLogo(raw?.logo ? resolvePublicMediaUrl(raw.logo) : '')
  }, [raw])

  const newLogoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : ''), [logoFile])
  useEffect(() => {
    return () => {
      if (newLogoPreview) URL.revokeObjectURL(newLogoPreview)
    }
  }, [newLogoPreview])

  const updateMutation = useMutation({
    mutationFn: (payload) => storeService.updateStore(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all() })
      if (id != null) queryClient.invalidateQueries({ queryKey: queryKeys.stores.detail(id) })
      navigate('/admin/stores')
    },
  })

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
    const latNum = form.latitude === '' ? null : Number(form.latitude)
    const lngNum = form.longitude === '' ? null : Number(form.longitude)
    updateMutation.mutate({
      name: form.name.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      latitude: latNum != null && !Number.isNaN(latNum) ? latNum : null,
      longitude: lngNum != null && !Number.isNaN(lngNum) ? lngNum : null,
      logo: logoFile || undefined,
    })
  }

  const latNum = form.latitude === '' ? null : Number(form.latitude)
  const lngNum = form.longitude === '' ? null : Number(form.longitude)
  const mapLat = latNum != null && !Number.isNaN(latNum) ? latNum : null
  const mapLng = lngNum != null && !Number.isNaN(lngNum) ? lngNum : null

  if (storeQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    )
  }

  const loadError = storeQuery.error?.message ?? null
  if (loadError || storeQuery.isError) {
    return (
      <div className="space-y-4">
        <Alert type="error" title={loadError || 'Failed to load store'} showIcon />
        <Button as={Link} variant="ghost" to="/admin/stores">
          Back to stores
        </Button>
      </div>
    )
  }

  const error = updateMutation.error?.message ?? null
  const submitting = updateMutation.isPending

  return (
    <div className="space-y-6">
      {error ? <Alert type="error" title={error} showIcon /> : null}

      <Card title={`Edit store #${id}`}>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            label="Store name"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="md:col-span-2"
          />
          <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          <Input
            label="Address (governorate)"
            name="address"
            value={form.address}
            onChange={handleChange}
          />
          <Input
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            className="md:col-span-2"
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
            <span className="text-xs text-slate-500">Leave empty to keep current logo.</span>
          </label>
          {newLogoPreview || existingLogo ? (
            <div className="md:col-span-2 flex items-center gap-3">
              <img
                src={newLogoPreview || existingLogo}
                alt="Store logo preview"
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              />
              {newLogoPreview ? <span className="text-xs text-slate-500">New logo preview</span> : null}
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
              {mapOpen ? 'Hide map' : 'Open map to adjust location'}
            </Button>
            {mapOpen ? (
              <div className="mt-4">
                <LocationPickerMap latitude={mapLat} longitude={mapLng} onChange={setCoords} height={360} />
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button as={Link} variant="ghost" to="/admin/stores">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
