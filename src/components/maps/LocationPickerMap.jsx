// Map: pick latitude/longitude by clicking (OpenStreetMap + Leaflet).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

const DEFAULT_CENTER = { lat: 34.7308, lng: 36.7090 } // Homs, Syria

const pickerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapSyncView({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: true })
  }, [map, center, zoom])
  return null
}

/**
 * @param {{
 *   latitude: number | null
 *   longitude: number | null
 *   onChange: (lat: number, lng: number) => void
 *   height?: number
 * }} props
 */
export function LocationPickerMap({ latitude, longitude, onChange, height = 320 }) {
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const hasPin =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude))

  const center = useMemo(() => {
    if (hasPin) return [Number(latitude), Number(longitude)]
    return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]
  }, [hasPin, latitude, longitude])

  const handlePick = useCallback(
    (lat, lng) => {
      onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
    },
    [onChange],
  )

  const runSearch = useCallback(async () => {
    const q = searchText.trim()
    if (!q) {
      setResults([])
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=sy&q=${encodeURIComponent(q)}`
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`)
      }
      const data = await res.json()
      const next = Array.isArray(data)
        ? data.map((row, idx) => ({
            key: `${row.place_id ?? idx}`,
            label: row.display_name ?? 'Unknown place',
            lat: Number(row.lat),
            lng: Number(row.lon),
          }))
            .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
        : []
      setResults(next)
      if (next.length === 0) {
        setSearchError('No matching place found in Syria.')
      }
    } catch (err) {
      setSearchError(err?.message ?? 'Location search failed')
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [searchText])

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Default center is Homs, Syria. Search for a place or click the map to set coordinates.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runSearch()
            }
          }}
          placeholder="Search location (e.g. Homs, Al Waer)"
          className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D29] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={searching}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:border-[#FF7D29] hover:text-[#FF7D29] disabled:opacity-60"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {searchError ? <p className="text-xs text-amber-600">{searchError}</p> : null}
      {results.length > 0 ? (
        <div className="rounded-md border border-slate-200 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.key}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => {
                handlePick(r.lat, r.lng)
                setResults([])
                setSearchError(null)
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="rounded-lg border border-slate-200 overflow-hidden [&_.leaflet-container]:z-[1] [&_.leaflet-control]:z-[2]"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={hasPin ? 15 : 11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <MapSyncView center={center} zoom={hasPin ? 15 : 11} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={handlePick} />
          {hasPin ? <Marker position={[Number(latitude), Number(longitude)]} icon={pickerIcon} /> : null}
        </MapContainer>
      </div>
    </div>
  )
}
