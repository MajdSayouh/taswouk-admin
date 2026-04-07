// View layer: dashboard — cards combine placeholder KPIs with live product/order snippets from the ViewModel.
import { useDashboardViewModel } from '../../viewmodels/useDashboardViewModel'
import { Card } from '../../components/ui/Card'
import { Alert, Spin } from 'antd'

export function DashboardPage() {
  const {
    stats,
    recentOrders,
    topProducts,
    loading,
    productsError,
    ordersError,
    refetch,
  } = useDashboardViewModel()

  return (
    <div className="space-y-6">
      {(productsError || ordersError) && (
        <div className="space-y-2">
          {productsError ? (
            <Alert
              type="error"
              message="Products"
              description={productsError}
              showIcon
              action={
                <button
                  type="button"
                  className="text-sm text-[#FF7D29] font-medium"
                  onClick={() => refetch()}
                >
                  Retry
                </button>
              }
            />
          ) : null}
          {ordersError ? (
            <Alert
              type="warning"
              message="Orders"
              description={ordersError}
              showIcon
            />
          ) : null}
        </div>
      )}

      <Spin spinning={loading}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card title="Total Revenue">
            <p className="text-2xl font-semibold text-[#FF7D29]">
              SAR {stats.totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Today: SAR {stats.todayRevenue.toLocaleString()} (placeholder — no revenue API yet)
            </p>
          </Card>
          <Card title="Orders">
            <p className="text-2xl font-semibold text-slate-900">
              {stats.totalOrders.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Pending fulfillment: {stats.pendingOrders}
            </p>
          </Card>
          <Card title="Customers">
            <p className="text-2xl font-semibold text-slate-900">
              {stats.totalCustomers.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">Placeholder — no customers API in OpenAPI v2</p>
          </Card>
          <Card title="Active products">
            <p className="text-2xl font-semibold text-slate-900">
              {stats.activeProducts.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">From GET /api/items</p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 mt-6">
          <Card title="Recent orders">
            <div className="space-y-3 text-sm">
              {recentOrders.length === 0 && !ordersError ? (
                <p className="text-slate-500 text-sm">No orders returned yet.</p>
              ) : null}
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b border-slate-800/60 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-slate-100">{order.number}</p>
                    <p className="text-xs text-slate-500">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      SAR {order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-[#FF7D29] capitalize">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Top products">
            <div className="space-y-3 text-sm">
              {topProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between border-b border-slate-800/60 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.category} • {product.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      SAR {product.price.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500">{product.stock} in stock</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="New customers">
            <p className="text-sm text-slate-500">
              Customer listing will connect here when the API exposes a customers resource.
            </p>
          </Card>
        </div>
      </Spin>
    </div>
  )
}
