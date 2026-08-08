// Read-only map: delivery destination + optional driver position (Leaflet).
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = { lat: 34.7308, lng: 36.709 }

const destinationIcon = L.divIcon({
  className: 'order-map-marker order-map-marker--destination',
  html: '<span aria-hidden="true"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const driverIcon = L.divIcon({
  className: 'order-map-marker order-map-marker--driver',
  html: '<span aria-hidden="true"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

/**
 * @param {{ points: [number, number][]; zoom: number }} props
 */
function MapFitBounds({ points, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) {
      map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], zoom)
      return
    }
    if (points.length === 1) {
      map.setView(points[0], zoom)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 })
  }, [map, points, zoom])
  return null
}

/**
 * @param {{
 *   destination: { lat: number; lng: number } | null
 *   driver: { lat: number; lng: number } | null
 *   destinationLabel?: string
 *   driverLabel?: string
 *   height?: number
 * }} props
 */
export function OrderTrackingMap({
  destination,
  driver,
  destinationLabel = 'Delivery',
  driverLabel = 'Driver',
  height = 280,
}) {
  const destPos = destination ? [destination.lat, destination.lng] : null
  const driverPos = driver ? [driver.lat, driver.lng] : null

  const points = useMemo(() => {
    /** @type {[number, number][]} */
    const out = []
    if (destPos) out.push(/** @type {[number, number]} */ (destPos))
    if (driverPos) out.push(/** @type {[number, number]} */ (driverPos))
    return out
  }, [destPos, driverPos])

  const center = useMemo(() => {
    if (destPos) return /** @type {[number, number]} */ (destPos)
    if (driverPos) return /** @type {[number, number]} */ (driverPos)
    return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]
  }, [destPos, driverPos])

  const zoom = points.length > 1 ? 12 : 14

  return (
    <div
      className="rounded-lg border border-slate-200 overflow-hidden order-tracking-map [&_.leaflet-container]:z-[1]"
      style={{ height }}
    >
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <MapFitBounds points={points} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {destPos ? (
          <Marker position={destPos} icon={destinationIcon}>
            <Popup>{destinationLabel}</Popup>
          </Marker>
        ) : null}
        {driverPos ? (
          <Marker position={driverPos} icon={driverIcon}>
            <Popup>{driverLabel}</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  )
}
