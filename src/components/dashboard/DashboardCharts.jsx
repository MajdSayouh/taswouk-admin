import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const BAR_FILL = '#FF7D29'
const SPLIT_TWO = ['#22c55e', '#FF7D29']
const SPLIT_THREE = ['#22c55e', '#FF7D29', '#94a3b8']
/** Enough segments for pipeline + cancelled + other */
const PALETTE = [
  '#FF7D29',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#eab308',
  '#64748b',
  '#ec4899',
  '#0ea5e9',
]

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">—</div>
  )
}

function ChartBlock({ title, children }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-slate-600 mb-2">{title}</p>
      {children}
    </div>
  )
}

/**
 * @param {{
 *   chartByStatus: { key: string; count: number }[]
 *   pipelineMix: { key: string; value: number }[]
 *   pieByStatus: { key: string; count: number }[]
 *   dailyTrend: { key: string; label: string; orders: number; revenue: number }[]
 *   outcomeRevenue: { key: string; value: number }[]
 *   nameForStatus: (key: string) => string
 *   nameForMix: (key: string) => string
 *   nameForOutcome: (key: string) => string
 *   nameOther: string
 *   formatCurrency: (n: number) => string
 *   usersByRole?: { key: string; count: number }[]
 *   totalUserAccounts?: number
 *   nameForUserRole?: (key: string) => string
 *   captions: {
 *     chartByStatus: string
 *     chartRevenueSplit: string
 *     chartOrdersPie: string
 *     chartDailyVolume: string
 *     chartDailyRevenue: string
 *     chartOutcomeSplit: string
 *     chartUsersByRole: string
 *     kpiTotalUsers: string
 *     sectionOrdersLabel?: string
 *     sectionUsersLabel?: string
 *   }
 * }} props
 */
export function DashboardCharts({
  chartByStatus,
  pipelineMix,
  pieByStatus,
  dailyTrend,
  outcomeRevenue,
  usersByRole,
  totalUserAccounts,
  nameForUserRole,
  nameForStatus,
  nameForMix,
  nameForOutcome,
  nameOther,
  formatCurrency,
  captions,
}) {
  const barRows = chartByStatus.map((row) => ({
    ...row,
    label: nameForStatus(row.key),
  }))

  const pieMixRows = pipelineMix.map((row) => ({
    ...row,
    name: nameForMix(row.key),
    value: Math.max(0, Number(row.value) || 0),
  }))
  const pieMixTotal = pieMixRows.reduce((s, r) => s + r.value, 0)

  const pieStatusRows = pieByStatus.map((row) => ({
    ...row,
    name: row.key === 'other' ? nameOther : nameForStatus(row.key),
    value: Math.max(0, Number(row.count) || 0),
  }))
  const pieStatusTotal = pieStatusRows.reduce((s, r) => s + r.value, 0)

  const outcomeRows = outcomeRevenue.map((row) => ({
    ...row,
    name: nameForOutcome(row.key),
    value: Math.max(0, Number(row.value) || 0),
  }))
  const outcomeTotal = outcomeRows.reduce((s, r) => s + r.value, 0)

  const dailyBars = dailyTrend.map((d) => ({
    ...d,
    label: d.label,
  }))
  const dailyHasOrders = dailyBars.some((d) => d.orders > 0)
  const dailyHasRevenue = dailyBars.some((d) => d.revenue > 0)

  const userBarRows =
    usersByRole && nameForUserRole
      ? usersByRole.map((row) => ({
          ...row,
          label: nameForUserRole(row.key),
        }))
      : []
  const userBarTotal = userBarRows.reduce((s, r) => s + (Number(r.count) || 0), 0)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          {captions.sectionOrdersLabel}
        </p>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
      <ChartBlock title={captions.chartByStatus}>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barRows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-22} textAnchor="end" height={56} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
              <Tooltip
                formatter={(value) => [value, '']}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: 8 }}
              />
              <Bar dataKey="count" fill={BAR_FILL} radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>

      <ChartBlock title={captions.chartRevenueSplit}>
        <div className="h-[200px] w-full">
          {pieMixTotal <= 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieMixRows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={2}
                >
                  {pieMixRows.map((_, i) => (
                    <Cell key={i} fill={SPLIT_TWO[i % SPLIT_TWO.length]} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartBlock>

      <ChartBlock title={captions.chartOrdersPie}>
        <div className="h-[200px] w-full">
          {pieStatusTotal <= 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieStatusRows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={76}
                  paddingAngle={1}
                >
                  {pieStatusRows.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, '']} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartBlock>

      <ChartBlock title={captions.chartDailyVolume}>
        <div className="h-[200px] w-full">
          {!dailyHasOrders ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBars} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={36} name="" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartBlock>

      <ChartBlock title={captions.chartDailyRevenue}>
        <div className="h-[200px] w-full">
          {!dailyHasRevenue ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBars} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={48}
                  tickFormatter={(v) =>
                    Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })
                  }
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartBlock>

      <ChartBlock title={captions.chartOutcomeSplit}>
        <div className="h-[200px] w-full">
          {outcomeTotal <= 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeRows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={74}
                  paddingAngle={2}
                >
                  {outcomeRows.map((_, i) => (
                    <Cell key={i} fill={SPLIT_THREE[i % SPLIT_THREE.length]} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartBlock>
        </div>
      </div>

      {nameForUserRole != null ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            {captions.sectionUsersLabel}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/90 p-4 shadow-sm flex flex-col justify-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {captions.kpiTotalUsers}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {typeof totalUserAccounts === 'number' ? totalUserAccounts.toLocaleString() : '—'}
              </p>
            </div>
            <ChartBlock title={captions.chartUsersByRole}>
              <div className="h-[200px] w-full">
                {userBarTotal <= 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userBarRows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={52} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
                      <Tooltip
                        formatter={(value) => [value, '']}
                        labelStyle={{ fontWeight: 600 }}
                        contentStyle={{ borderRadius: 8 }}
                      />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartBlock>
          </div>
        </div>
      ) : null}
    </div>
  )
}
