// The road a driver took with one order, pickup to door (admin only). Polls while the
// trip runs and stays still after it; a time slider replays where the driver was.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import { Alert, Descriptions, Slider, Spin, Tag } from 'antd'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAssignmentRoute } from '../../services/deliveryTrackingService.js'
import { queryKeys } from '../../query/queryKeys.js'
import { isRouteLive, minutesBetween, routeDistanceMeters } from '../../utils/liveDrivers.js'

const DEFAULT_CENTER = /** @type {[number, number]} */ ([34.7308, 36.709])
const ROUTE_POLL_MS = 10_000

const pointIcon = (variant) =>
  L.divIcon({
    className: `order-map-marker order-map-marker--${variant}`,
    html: '<span aria-hidden="true"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
const pickupIcon = pointIcon('pickup')
const destinationIcon = pointIcon('destination')
const driverIcon = pointIcon('driver')

/** @param {unknown} p */
function hasCoords(p) {
  const r = /** @type {{ latitude?: unknown; longitude?: unknown } | null} */ (p)
  return r != null && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)
}

/**
 * Fits the whole trip once per assignment; later polls only extend the line.
 * @param {{ positions: [number, number][]; fitKey: string }} props
 */
function FitTripOnce({ positions, fitKey }) {
  const map = useMap()
  const fitted = useRef(/** @type {string | null} */ (null))
  useEffect(() => {
    if (!positions.length || fitted.current === fitKey) return
    fitted.current = fitKey
    if (positions.length === 1) map.setView(positions[0], 15)
    else map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 16 })
  }, [map, positions, fitKey])
  return null
}

/** @param {string | null | undefined} iso */
function formatTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString()
}

/**
 * @param {{ assignmentId: number | string; enabled?: boolean; height?: number }} props
 */
export function AssignmentRouteMap({ assignmentId, enabled = true, height = 340 }) {
  const { t } = useTranslation('pages')
  const routeQuery = useQuery({
    queryKey: queryKeys.drivers.route(assignmentId),
    queryFn: ({ signal }) => getAssignmentRoute(assignmentId, { signal }),
    enabled: enabled && assignmentId != null,
    refetchInterval: (query) => (isRouteLive(query.state.data) ? ROUTE_POLL_MS : false),
    refetchIntervalInBackground: false,
  })
  const route = routeQuery.data
  const points = useMemo(() => (Array.isArray(route?.points) ? route.points.filter(hasCoords) : []), [route])
  const live = isRouteLive(route)

  // null = follow the latest point; a number = the admin is scrubbing the timeline.
  const [scrubIndex, setScrubIndex] = useState(/** @type {number | null} */ (null))
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new trip starts unscrubbed
    setScrubIndex(null)
  }, [assignmentId])

  const line = useMemo(() => points.map((p) => /** @type {[number, number]} */ ([p.latitude, p.longitude])), [points])
  const pickup = hasCoords(route?.pickup) ? route.pickup : null
  const destination = hasCoords(route?.destination) ? route.destination : null
  const fitPositions = useMemo(() => {
    const out = [...line]
    if (pickup) out.push([pickup.latitude, pickup.longitude])
    if (destination) out.push([destination.latitude, destination.longitude])
    return /** @type {[number, number][]} */ (out)
  }, [line, pickup, destination])

  if (routeQuery.isPending && enabled) {
    return (
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    )
  }
  if (routeQuery.error) {
    return <Alert type="error" showIcon message={t('route.loadError')} description={routeQuery.error.message} />
  }
  if (!route) return null

  const lastIndex = points.length - 1
  const shownIndex = scrubIndex == null ? lastIndex : Math.min(scrubIndex, lastIndex)
  const scrubPoint = points.length > 0 && scrubIndex != null ? points[shownIndex] : null
  const driverPoint = live && points.length > 0 ? points[lastIndex] : null
  const distanceKm = routeDistanceMeters(points) / 1000
  const minutes = minutesBetween(route.picked_up_at, route.delivered_at)
  const emDash = t('shared.emDash')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-800">{route.driver_name}</span>
        <Tag>{t(`orders.status.${route.status}`, { defaultValue: route.status })}</Tag>
        {live ? <Tag color="blue">{t('route.live')}</Tag> : null}
      </div>
      <div
        className="rounded-lg border border-slate-200 overflow-hidden [&_.leaflet-container]:z-[1]"
        style={{ height }}
      >
        <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitTripOnce positions={fitPositions} fitKey={String(assignmentId)} />
          {line.length > 1 ? <Polyline positions={line} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }} /> : null}
          {pickup ? (
            <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon}>
              <Popup>{pickup.name || t('route.pickup')}</Popup>
            </Marker>
          ) : null}
          {destination ? (
            <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
              <Popup>{destination.address_text || t('orders.detail.legendDestination')}</Popup>
            </Marker>
          ) : null}
          {driverPoint && !scrubPoint ? (
            <Marker position={[driverPoint.latitude, driverPoint.longitude]} icon={driverIcon}>
              <Popup>{route.driver_name}</Popup>
            </Marker>
          ) : null}
          {scrubPoint ? (
            <CircleMarker
              center={[scrubPoint.latitude, scrubPoint.longitude]}
              radius={8}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#ea580c', fillOpacity: 1 }}
            />
          ) : null}
        </MapContainer>
      </div>

      {points.length === 0 ? (
        <p className="text-xs text-slate-500">{t('route.empty')}</p>
      ) : points.length > 1 ? (
        <div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t('route.timeline')}</span>
            <span className="tabular-nums">{formatTime(points[shownIndex]?.recorded_at) ?? emDash}</span>
          </div>
          <Slider
            min={0}
            max={lastIndex}
            value={shownIndex}
            onChange={(v) => setScrubIndex(v === lastIndex ? null : v)}
            tooltip={{ formatter: (v) => formatTime(points[v ?? 0]?.recorded_at) }}
          />
        </div>
      ) : null}

      <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
        <Descriptions.Item label={t('route.pickedUp')}>{formatTime(route.picked_up_at) ?? emDash}</Descriptions.Item>
        <Descriptions.Item label={t('route.delivered')}>{formatTime(route.delivered_at) ?? emDash}</Descriptions.Item>
        <Descriptions.Item label={t('route.duration')}>
          {minutes != null ? t('route.minutes', { value: minutes }) : emDash}
        </Descriptions.Item>
        <Descriptions.Item label={t('route.distance')}>
          {points.length > 1 ? t('route.km', { value: distanceKm.toFixed(1) }) : emDash}
        </Descriptions.Item>
      </Descriptions>
    </div>
  )
}
