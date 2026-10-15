// Live drivers map — GET /api/delivery/drivers/live every 10 s (admin only).
// Spec: docs/live-drivers-map.md
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Empty, Input, Segmented, Spin, Tag } from 'antd'
import { EnvironmentOutlined, PhoneOutlined, SearchOutlined } from '@ant-design/icons'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LiveDriversMap } from '../../components/maps/LiveDriversMap.jsx'
import { RouteDrawer } from '../../components/maps/RouteDrawer.jsx'
import { OrderDetailModal } from '../../components/orders/OrderDetailModal.jsx'
import { useLiveDriversViewModel } from '../../viewmodels/useLiveDriversViewModel.js'
import { driverState, elapsedParts, stateMatchesFilter } from '../../utils/liveDrivers.js'
import { rowMatchesSearch } from '../../utils/tableFilters.js'

const FILTERS = /** @type {const} */ (['all', 'onTheRoad', 'available', 'stale'])

const STATE_DOT = {
  onTheRoad: 'bg-blue-600',
  assigned: 'bg-amber-600',
  available: 'bg-green-600',
  stale: 'bg-slate-400',
  noLocation: 'bg-red-500',
}

export function LiveDriversMapPage() {
  const { t } = useTranslation('pages')
  const { drivers, counts, loading, error, refetch } = useLiveDriversViewModel()
  const [filter, setFilter] = useState(/** @type {(typeof FILTERS)[number]} */ ('all'))
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(/** @type {number | null} */ (null))
  const [focusToken, setFocusToken] = useState(0)
  const [fitToken, setFitToken] = useState(0)
  const [routeFor, setRouteFor] = useState(/** @type {{ assignment_id: number; order_number?: string } | null} */ (null))
  const [orderFor, setOrderFor] = useState(/** @type {{ order_id: number; order_kind: string } | null} */ (null))

  const visible = useMemo(
    () =>
      drivers.filter(
        (d) => stateMatchesFilter(filter, driverState(d)) && rowMatchesSearch(search, d.name, d.phone, d.vehicle_type),
      ),
    [drivers, filter, search],
  )

  const ago = (/** @type {number | undefined} */ seconds) => {
    const parts = elapsedParts(seconds)
    return parts ? t(`liveDrivers.units.${parts.unit}`, { value: parts.value }) : t('shared.emDash')
  }

  const stateLabel = (/** @type {any} */ d) => {
    const state = driverState(d)
    if (state === 'stale') return t('liveDrivers.staleFor', { time: ago(d.location.seconds_since_update) })
    return t(`liveDrivers.state.${state}`)
  }

  const selectDriver = (/** @type {number} */ id) => {
    setSelectedId(id)
    setFocusToken((n) => n + 1)
  }

  const renderPopup = (/** @type {any} */ d) => (
    <div className="space-y-1.5 text-sm" dir="auto">
      <div className="font-semibold text-slate-900">{d.name}</div>
      {d.phone ? (
        <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 tabular-nums" dir="ltr">
          <PhoneOutlined /> {d.phone}
        </a>
      ) : null}
      {d.vehicle_type ? <div className="text-slate-600">{d.vehicle_type}</div> : null}
      <div className="text-slate-500 text-xs">
        {t('liveDrivers.updatedAgo', { time: ago(d.location?.seconds_since_update) })}
      </div>
      {d.open_orders?.length ? (
        <ul className="pt-1 space-y-1.5 border-t border-slate-100">
          {d.open_orders.map((o) => (
            <li key={o.assignment_id} className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="font-medium text-blue-700 hover:underline"
                onClick={() => setOrderFor({ order_id: o.order_id, order_kind: o.order_kind })}
              >
                {o.order_number || o.order_id}
              </button>
              <Tag className="!m-0">{t(`orders.status.${o.status}`, { defaultValue: o.status })}</Tag>
              {o.picked_up_at ? (
                <button
                  type="button"
                  className="text-xs text-blue-700 hover:underline"
                  onClick={() => setRouteFor(o)}
                >
                  {t('liveDrivers.showRoute')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )

  const located = counts.onTheRoad + counts.assigned + counts.available

  return (
    <div className="space-y-4">
      {error ? (
        <Alert
          type="error"
          title={t('liveDrivers.loadError')}
          description={error}
          showIcon
          action={
            <Button type="button" variant="ghost" onClick={() => refetch()}>
              {t('shared.retry')}
            </Button>
          }
        />
      ) : null}

      <p className="text-sm text-slate-600">{t('liveDrivers.subtitle')}</p>

      <Card
        title={t('liveDrivers.title')}
        actions={
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
              {t('liveDrivers.connected', { count: located })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              {t('liveDrivers.disconnected', { count: counts.stale })}
            </span>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Segmented
            value={filter}
            onChange={(v) => setFilter(/** @type {any} */ (v))}
            options={FILTERS.map((f) => ({ value: f, label: t(`liveDrivers.filter.${f}`) }))}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('liveDrivers.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!w-64 max-w-full"
          />
          <Button type="button" variant="ghost" onClick={() => setFitToken((n) => n + 1)}>
            {t('liveDrivers.fitAll')}
          </Button>
        </div>

        <Spin spinning={loading}>
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="max-h-[560px] overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 order-2 lg:order-1">
              {visible.length === 0 ? (
                <Empty className="py-10" image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('liveDrivers.empty')} />
              ) : (
                visible.map((d) => {
                  const state = driverState(d)
                  const roadOrder = d.open_orders?.find((o) => o.status === 'out_for_delivery')
                  return (
                    <button
                      key={d.driver_id}
                      type="button"
                      disabled={!d.location}
                      onClick={() => selectDriver(d.driver_id)}
                      className={`w-full text-start px-3 py-2.5 transition-colors ${
                        d.driver_id === selectedId ? 'bg-blue-50' : 'hover:bg-slate-50'
                      } disabled:cursor-default disabled:hover:bg-transparent`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${STATE_DOT[state]}`} />
                        <span className="font-medium text-slate-900 truncate">{d.name}</span>
                        <span className="ms-auto text-xs text-slate-500 shrink-0">{stateLabel(d)}</span>
                      </div>
                      <div className="ps-4.5 mt-0.5 text-xs text-slate-500 flex gap-2">
                        {roadOrder ? <span>{roadOrder.order_number || roadOrder.order_id}</span> : null}
                        {d.location && state !== 'stale' ? (
                          <span>{t('liveDrivers.updatedAgo', { time: ago(d.location.seconds_since_update) })}</span>
                        ) : null}
                        {!d.location ? <span>{t('liveDrivers.noLocation')}</span> : null}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
            <div className="order-1 lg:order-2">
              <LiveDriversMap
                drivers={visible}
                selectedId={selectedId}
                focusToken={focusToken}
                fitToken={fitToken}
                onSelect={setSelectedId}
                renderPopup={renderPopup}
              />
              {drivers.length > 0 && located + counts.stale === 0 ? (
                <p className="mt-2 text-xs text-amber-700 inline-flex items-center gap-1">
                  <EnvironmentOutlined /> {t('liveDrivers.noneLocated')}
                </p>
              ) : null}
            </div>
          </div>
        </Spin>
      </Card>

      <RouteDrawer assignment={routeFor} onClose={() => setRouteFor(null)} />
      <OrderDetailModal
        open={Boolean(orderFor)}
        orderId={orderFor?.order_id ?? null}
        previewRecord={orderFor ? { orderType: orderFor.order_kind } : null}
        deliveryUserId={null}
        driverName={null}
        onClose={() => setOrderFor(null)}
      />
    </div>
  )
}
