// Live map of every delivery driver's last position (Leaflet). Markers are keyed by
// driver id so react-leaflet moves them on each poll instead of redrawing them.
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { driverState } from '../../utils/liveDrivers.js'

const DEFAULT_CENTER = /** @type {[number, number]} */ ([34.7308, 36.709])

/** @type {Map<string, L.DivIcon>} */
const iconCache = new Map()

/**
 * The teardrop's point is its top-right corner (45°), so rotate by heading − 45.
 * Headings are bucketed to 10° so a poll rarely swaps the icon.
 * @param {string} state
 * @param {number | null | undefined} heading
 * @param {boolean} selected
 */
function driverIcon(state, heading, selected) {
  const bucket = Number.isFinite(heading) ? Math.round(/** @type {number} */ (heading) / 10) * 10 : null
  const key = `${state}:${bucket}:${selected}`
  let icon = iconCache.get(key)
  if (!icon) {
    const classes = ['live-driver-marker', `live-driver-marker--${state}`]
    if (bucket != null) classes.push('live-driver-marker--heading')
    if (selected) classes.push('live-driver-marker--selected')
    const style = bucket != null ? ` style="transform: rotate(${bucket - 45}deg)"` : ''
    icon = L.divIcon({
      className: classes.join(' '),
      html: `<span aria-hidden="true"${style}></span>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    })
    iconCache.set(key, icon)
  }
  return icon
}

/**
 * Fits every marker on the first load that has any, and again whenever `fitToken`
 * changes ("show all"). Never on a plain poll, so the map does not jump under the user.
 * @param {{ positions: [number, number][]; fitToken: number }} props
 */
function FitOnDemand({ positions, fitToken }) {
  const map = useMap()
  const fittedToken = useRef(/** @type {number | null} */ (null))
  useEffect(() => {
    if (!positions.length || fittedToken.current === fitToken) return
    fittedToken.current = fitToken
    if (positions.length === 1) map.setView(positions[0], 15)
    else map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 15 })
  }, [map, positions, fitToken])
  return null
}

/**
 * Flies to the selected driver and opens their popup, each time `focusToken` changes.
 * @param {{ position: [number, number] | null; focusToken: number; markerRef: () => L.Marker | undefined }} props
 */
function FocusSelected({ position, focusToken, markerRef }) {
  const map = useMap()
  const lastToken = useRef(0)
  useEffect(() => {
    if (!focusToken || focusToken === lastToken.current || !position) return
    lastToken.current = focusToken
    map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.6 })
    markerRef()?.openPopup()
  }, [map, position, focusToken, markerRef])
  return null
}

/**
 * @param {{
 *   drivers: any[]
 *   selectedId: number | null
 *   focusToken: number
 *   fitToken: number
 *   onSelect: (driverId: number) => void
 *   renderPopup: (driver: any) => import('react').ReactNode
 *   height?: number | string
 * }} props
 */
export function LiveDriversMap({ drivers, selectedId, focusToken, fitToken, onSelect, renderPopup, height = 560 }) {
  const markers = useRef(/** @type {Map<number, L.Marker>} */ (new Map()))
  const located = drivers.filter((d) => d.location)
  const positions = located.map((d) => /** @type {[number, number]} */ ([d.location.latitude, d.location.longitude]))
  const selected = located.find((d) => d.driver_id === selectedId) ?? null
  const selectedPos = selected
    ? /** @type {[number, number]} */ ([selected.location.latitude, selected.location.longitude])
    : null

  return (
    <div
      className="rounded-lg border border-slate-200 overflow-hidden [&_.leaflet-container]:z-[1]"
      style={{ height }}
    >
      <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnDemand positions={positions} fitToken={fitToken} />
        <FocusSelected
          position={selectedPos}
          focusToken={focusToken}
          markerRef={() => (selectedId != null ? markers.current.get(selectedId) : undefined)}
        />
        {located.map((d) => (
          <Marker
            key={d.driver_id}
            position={[d.location.latitude, d.location.longitude]}
            icon={driverIcon(driverState(d), d.location.heading, d.driver_id === selectedId)}
            zIndexOffset={d.driver_id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(d.driver_id) }}
            ref={(marker) => {
              if (marker) markers.current.set(d.driver_id, marker)
              else markers.current.delete(d.driver_id)
            }}
          >
            <Popup minWidth={240}>{renderPopup(d)}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
