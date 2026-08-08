// View layer: dashboard — KPIs from live orders/products + compact charts.
import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDashboardViewModel } from '../../viewmodels/useDashboardViewModel'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/PageLoader.jsx'
import { Alert, Skeleton } from 'antd'
import { getFulfillmentProgressPercent } from '../../utils/orderFulfillment.js'

const DashboardCharts = lazy(() =>
  import('../../components/dashboard/DashboardCharts.jsx').then((m) => ({
    default: m.DashboardCharts,
  })),
)

function formatAmount(amount) {
  const n = Number(amount) || 0
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function KpiValue({ loading, children }) {
  if (loading) {
    return <Skeleton.Input active size="small" className="!h-8 !w-28 !min-w-0 mt-1" />
  }
  return children
}

export function DashboardPage() {
  const { t } = useTranslation('pages')
  const {
    stats,
    recentOrders,
    topProducts,
    chartByStatus,
    pipelineMix,
    pieByStatus,
    dailyTrend,
    outcomeRevenue,
    usersByRole,
    totalUserAccounts,
    isAdmin,
    ordersLoading,
    productsLoading,
    chartsReady,
    productsError,
    ordersError,
    usersError,
    refetch,
  } = useDashboardViewModel()

  const formatMoney = (n) => t('dashboard.currency', { amount: formatAmount(n) })

  const chartCaptions = useMemo(
    () => ({
      sectionOrdersLabel: t('dashboard.sectionOrders'),
      sectionUsersLabel: t('dashboard.sectionUsers'),
      chartByStatus: t('dashboard.chartByStatus'),
      chartRevenueSplit: t('dashboard.chartRevenueSplit'),
      chartOrdersPie: t('dashboard.chartOrdersPie'),
      chartDailyVolume: t('dashboard.chartDailyVolume'),
      chartDailyRevenue: t('dashboard.chartDailyRevenue'),
      chartOutcomeSplit: t('dashboard.chartOutcomeSplit'),
      chartUsersByRole: t('dashboard.chartUsersByRole'),
      kpiTotalUsers: t('dashboard.kpiTotalUsers'),
    }),
    [t],
  )

  return (
    <div className="space-y-6">
      {(productsError || ordersError || usersError) && (
        <div className="space-y-2">
          {productsError ? (
            <Alert
              type="error"
              title={t('dashboard.products')}
              description={productsError}
              showIcon
              action={
                <button
                  type="button"
                  className="text-sm text-[#FF7D29] font-medium"
                  onClick={() => refetch()}
                >
                  {t('shared.retry')}
                </button>
              }
            />
          ) : null}
          {ordersError ? (
            <Alert
              type="warning"
              title={t('dashboard.orders')}
              description={ordersError}
              showIcon
            />
          ) : null}
          {usersError ? (
            <Alert
              type="warning"
              title={t('dashboard.users')}
              description={usersError}
              showIcon
            />
          ) : null}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {t('dashboard.deliveredRevenue')}
          </p>
          <KpiValue loading={ordersLoading}>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#FF7D29]">
              {formatMoney(stats.deliveredRevenue)}
            </p>
          </KpiValue>
          <p className="mt-1 text-xs text-slate-500">{t('dashboard.deliveredRevenueSub')}</p>
          <p className="mt-2 text-xs text-slate-600">
            <span className="text-slate-400">{t('dashboard.todayDelivered')}: </span>
            {ordersLoading ? '…' : formatMoney(stats.todayDeliveredTotal)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {t('dashboard.pipelineValue')}
          </p>
          <KpiValue loading={ordersLoading}>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {formatMoney(stats.pipelineValue)}
            </p>
          </KpiValue>
          <p className="mt-1 text-xs text-slate-500">{t('dashboard.pipelineSub')}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {t('dashboard.ordersCard')}
          </p>
          <KpiValue loading={ordersLoading}>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {stats.totalOrders.toLocaleString()}
            </p>
          </KpiValue>
          <p className="mt-1 text-xs text-amber-700">
            {ordersLoading
              ? '…'
              : t('dashboard.pendingFulfillment', { count: stats.pendingOrders })}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {t('dashboard.activeProducts')}
          </p>
          <KpiValue loading={productsLoading}>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {stats.activeProducts.toLocaleString()}
            </p>
          </KpiValue>
          <p className="mt-1 text-xs text-slate-500">{t('dashboard.activeProductsSub')}</p>
          <p className="mt-2 text-xs text-slate-600">
            <span className="text-slate-400">{t('dashboard.uniqueBuyers')}: </span>
            {ordersLoading ? '…' : stats.uniqueBuyers.toLocaleString()}
          </p>
        </div>
      </div>

      <Card className="mt-6">
        {chartsReady ? (
          <Suspense fallback={<PageLoader />}>
            <DashboardCharts
              chartByStatus={chartByStatus}
              pipelineMix={pipelineMix}
              pieByStatus={pieByStatus}
              dailyTrend={dailyTrend}
              outcomeRevenue={outcomeRevenue}
              usersByRole={isAdmin ? usersByRole : undefined}
              totalUserAccounts={isAdmin ? totalUserAccounts : undefined}
              nameForUserRole={
                isAdmin
                  ? (key) => {
                      const K = String(key).toUpperCase()
                      if (['ADMIN', 'SELLER', 'CUSTOMER', 'DELIVERY', 'UNKNOWN'].includes(K)) {
                        return t(`adminUsers.role.${K}`)
                      }
                      return K
                    }
                  : undefined
              }
              nameForStatus={(key) => t(`orders.status.${key}`)}
              nameForMix={(key) =>
                key === 'delivered' ? t('dashboard.legendDelivered') : t('dashboard.legendPipeline')
              }
              nameForOutcome={(key) =>
                key === 'delivered'
                  ? t('dashboard.legendDelivered')
                  : key === 'pipeline'
                    ? t('dashboard.legendPipeline')
                    : t('dashboard.legendCancelled')
              }
              nameOther={t('dashboard.legendOther')}
              formatCurrency={formatMoney}
              captions={chartCaptions}
            />
          </Suspense>
        ) : (
          <PageLoader />
        )}
      </Card>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">{t('dashboard.sectionActivity')}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={t('dashboard.recentOrders')}>
            <div className="space-y-2 text-sm">
              {ordersLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : recentOrders.length === 0 && !ordersError ? (
                <p className="text-slate-500">{t('dashboard.noOrdersYet')}</p>
              ) : null}
              {!ordersLoading
                ? recentOrders.map((order) => {
                    const pct = getFulfillmentProgressPercent(order.status)
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{order.number}</p>
                          <p className="text-xs text-slate-500 truncate">{order.customerName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatMoney(order.total)}
                          </p>
                          <div className="mt-1 flex items-center gap-2 justify-end">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#FF7D29]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 tabular-nums w-8">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                : null}
            </div>
          </Card>

          <Card title={t('dashboard.topProducts')}>
            <div className="space-y-2 text-sm">
              {productsLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : topProducts.length === 0 ? (
                <p className="text-slate-500">—</p>
              ) : null}
              {!productsLoading
                ? topProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{product.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {product.category} · {product.sku}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatMoney(product.price)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {product.storeId
                            ? t('dashboard.storeRef', { id: product.storeId })
                            : product.category}
                        </p>
                      </div>
                    </div>
                  ))
                : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
