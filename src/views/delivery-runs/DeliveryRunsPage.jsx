// «جداول تسليم الطلبات» for local orders (owner, 2026-11-24): a run is the local orders one driver
// takes out on a day. Orders wait here by where they are — still on the way from their store to
// Taswouk's warehouse («قيد الشحن الداخلي»), ready, or shipped and not delivered — and each order
// of a run that left is marked delivered, or not delivered with a reason.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd'
import { PlusOutlined, PrinterOutlined } from '@ant-design/icons'
import { Card } from '../../components/ui/Card'
import { useDriversViewModel } from '../../viewmodels/useDriversViewModel.js'
import {
  useAddOrdersToRun,
  useCloseDeliveryRun,
  useCreateDeliveryRun,
  useDecideRunOrder,
  useDeliveryRun,
  useDeliveryRunCandidates,
  useDeliveryRuns,
  useDispatchDeliveryRun,
  useRemoveOrderFromRun,
  useSetOrderInternalStage,
} from '../../viewmodels/useDeliveryRunsViewModel.js'
import { printDeliveryRun } from './printDeliveryRun.js'

const RUN_STATUS_COLOR = { planned: 'blue', out: 'orange', closed: 'default' }
const OUTCOME_COLOR = { pending: 'default', delivered: 'green', failed: 'red' }

function useAct() {
  const { t } = useTranslation('pages')
  return async (promise, okText) => {
    try {
      const result = await promise
      if (okText) message.success(okText)
      return result
    } catch (err) {
      message.error(err?.message ?? t('deliveryRuns.failed'))
      return null
    }
  }
}

function CustomerCell({ row }) {
  return (
    <span>
      {row.customer_name || '—'}
      {row.customer_phone ? <span className="block text-xs text-slate-500">{row.customer_phone}</span> : null}
    </span>
  )
}

function AddressCell({ row }) {
  return (
    <span>
      {row.address_text || '—'}
      {row.delivery_instruction ? (
        <span className="block text-xs text-slate-500">{row.delivery_instruction}</span>
      ) : null}
    </span>
  )
}

function NewRunModal({ open, day, onClose, onCreated }) {
  const { t } = useTranslation('pages')
  const [form] = Form.useForm()
  const { drivers, loading } = useDriversViewModel({ fetchOnMount: open })
  const create = useCreateDeliveryRun()
  const act = useAct()

  const submit = async () => {
    const values = await form.validateFields()
    const run = await act(
      create.mutateAsync({
        day: values.day.format('YYYY-MM-DD'),
        driver_id: values.driver_id ? Number(values.driver_id) : null,
        note: values.note ?? '',
      }),
      t('deliveryRuns.created'),
    )
    if (run) {
      form.resetFields()
      onCreated(run)
    }
  }

  return (
    <Modal
      open={open}
      title={t('deliveryRuns.newRun')}
      okText={t('deliveryRuns.create')}
      onOk={submit}
      onCancel={onClose}
      confirmLoading={create.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ day: dayjs(day) }} preserve={false}>
        <Form.Item name="day" label={t('deliveryRuns.day')} rules={[{ required: true }]}>
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item name="driver_id" label={t('deliveryRuns.driver')} extra={t('deliveryRuns.driverHint')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={loading}
            options={drivers
              .filter((d) => d.active)
              .map((d) => ({ value: d.id, label: `${d.name}${d.phone !== '—' ? ` — ${d.phone}` : ''}` }))}
          />
        </Form.Item>
        <Form.Item name="note" label={t('deliveryRuns.note')}>
          <Input maxLength={300} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function FailedModal({ target, onClose, onSubmit, loading }) {
  const { t } = useTranslation('pages')
  const [reason, setReason] = useState('')
  return (
    <Modal
      open={Boolean(target)}
      title={t('deliveryRuns.notDeliveredTitle', { id: target?.order_id })}
      okText={t('deliveryRuns.save')}
      okButtonProps={{ disabled: !reason.trim(), danger: true }}
      confirmLoading={loading}
      onOk={async () => {
        if (await onSubmit(reason.trim())) setReason('')
      }}
      onCancel={() => {
        setReason('')
        onClose()
      }}
    >
      <p className="text-sm text-slate-600">{t('deliveryRuns.notDeliveredHint')}</p>
      <Input.TextArea
        rows={3}
        maxLength={300}
        value={reason}
        placeholder={t('deliveryRuns.reasonPlaceholder')}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  )
}

function RunDetail({ runId }) {
  const { t } = useTranslation('pages')
  const query = useDeliveryRun(runId)
  const run = query.data
  const dispatch = useDispatchDeliveryRun()
  const close = useCloseDeliveryRun()
  const decide = useDecideRunOrder()
  const remove = useRemoveOrderFromRun()
  const act = useAct()
  const [failing, setFailing] = useState(null)

  if (query.isLoading) return <Card title={t('deliveryRuns.run', { id: runId })}>…</Card>
  if (query.error || !run) {
    return <Alert type="error" message={query.error?.message ?? t('deliveryRuns.failed')} />
  }

  const columns = [
    { title: '#', dataIndex: 'position', width: 48 },
    { title: t('deliveryRuns.col.order'), dataIndex: 'order_id', render: (id) => `#${id}` },
    { title: t('deliveryRuns.col.store'), dataIndex: 'store_name' },
    { title: t('deliveryRuns.col.customer'), key: 'customer', render: (_, r) => <CustomerCell row={r} /> },
    { title: t('deliveryRuns.col.address'), key: 'address', render: (_, r) => <AddressCell row={r} /> },
    { title: t('deliveryRuns.col.total'), dataIndex: 'total_amount' },
    { title: t('deliveryRuns.col.status'), dataIndex: 'status_label' },
    {
      title: t('deliveryRuns.col.outcome'),
      key: 'outcome',
      render: (_, r) => (
        <span>
          <Tag color={OUTCOME_COLOR[r.outcome]}>{r.outcome_label}</Tag>
          {r.reason ? <span className="block text-xs text-slate-500">{r.reason}</span> : null}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => {
        if (run.status === 'planned') {
          return (
            <Button
              size="small"
              danger
              loading={remove.isPending}
              onClick={() => act(remove.mutateAsync({ runId: run.id, orderId: r.order_id }))}
            >
              {t('deliveryRuns.remove')}
            </Button>
          )
        }
        if (run.status === 'out' && r.outcome === 'pending') {
          return (
            <Space size="small" wrap>
              <Button
                size="small"
                type="primary"
                loading={decide.isPending}
                onClick={() =>
                  act(
                    decide.mutateAsync({ runId: run.id, orderId: r.order_id, outcome: 'delivered' }),
                    t('deliveryRuns.markedDelivered', { id: r.order_id }),
                  )
                }
              >
                {t('deliveryRuns.delivered')}
              </Button>
              <Button size="small" danger onClick={() => setFailing(r)}>
                {t('deliveryRuns.notDelivered')}
              </Button>
            </Space>
          )
        }
        return null
      },
    },
  ]

  const counts = run.counts ?? {}
  return (
    <Card
      title={
        <span>
          {t('deliveryRuns.run', { id: run.id })} — {run.day}{' '}
          <Tag color={RUN_STATUS_COLOR[run.status]}>{run.status_label}</Tag>
        </span>
      }
      actions={
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={() => printDeliveryRun(run, t)} disabled={!run.orders?.length}>
            {t('deliveryRuns.print')}
          </Button>
          {run.status === 'planned' ? (
            <Popconfirm
              title={t('deliveryRuns.dispatchConfirm')}
              onConfirm={() => act(dispatch.mutateAsync(run.id), t('deliveryRuns.dispatched'))}
            >
              <Button type="primary" loading={dispatch.isPending} disabled={!run.orders?.length}>
                {t('deliveryRuns.dispatch')}
              </Button>
            </Popconfirm>
          ) : null}
          {run.status === 'out' ? (
            <Button
              loading={close.isPending}
              disabled={counts.pending > 0}
              onClick={() => act(close.mutateAsync(run.id), t('deliveryRuns.closed'))}
            >
              {t('deliveryRuns.close')}
            </Button>
          ) : null}
        </Space>
      }
    >
      <p className="text-sm text-slate-600 mb-3">
        {t('deliveryRuns.driver')}: {run.driver_name || t('deliveryRuns.noDriver')}
        {run.note ? ` — ${run.note}` : ''}
        {' · '}
        {t('deliveryRuns.countsLine', counts)}
      </p>
      <Table
        rowKey="order_id"
        size="small"
        columns={columns}
        dataSource={run.orders ?? []}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty description={t('deliveryRuns.emptyRun')} /> }}
      />
      <FailedModal
        target={failing}
        loading={decide.isPending}
        onClose={() => setFailing(null)}
        onSubmit={async (reason) => {
          const done = await act(
            decide.mutateAsync({ runId: run.id, orderId: failing.order_id, outcome: 'failed', reason }),
            t('deliveryRuns.markedFailed', { id: failing.order_id }),
          )
          if (done) setFailing(null)
          return Boolean(done)
        }}
      />
    </Card>
  )
}

function Candidates({ plannedRun }) {
  const { t } = useTranslation('pages')
  const query = useDeliveryRunCandidates()
  const add = useAddOrdersToRun()
  const stage = useSetOrderInternalStage()
  const act = useAct()
  const [tab, setTab] = useState('ready')
  const [selected, setSelected] = useState([])
  const [governorate, setGovernorate] = useState(null)

  const groups = useMemo(
    () => query.data ?? { ready: [], internal_shipping: [], out_not_delivered: [] },
    [query.data],
  )
  const governorates = useMemo(
    () =>
      [...new Set(Object.values(groups).flat().map((o) => o.governorate).filter(Boolean))].sort(),
    [groups],
  )
  const shown = (rows) => (governorate ? rows.filter((o) => o.governorate === governorate) : rows)

  const setStage = (orderId, value, okKey) =>
    act(stage.mutateAsync({ orderId, stage: value }), t(okKey, { id: orderId }))

  const columns = [
    { title: t('deliveryRuns.col.order'), dataIndex: 'order_id', render: (id) => `#${id}` },
    { title: t('deliveryRuns.col.store'), dataIndex: 'store_name' },
    { title: t('deliveryRuns.col.governorate'), dataIndex: 'governorate', render: (v) => v || '—' },
    { title: t('deliveryRuns.col.customer'), key: 'customer', render: (_, r) => <CustomerCell row={r} /> },
    { title: t('deliveryRuns.col.address'), key: 'address', render: (_, r) => <AddressCell row={r} /> },
    {
      title: t('deliveryRuns.col.status'),
      key: 'status',
      render: (_, r) => (
        <span>
          {r.status_label}
          {r.internal_stage_label ? <Tag className="ms-1">{r.internal_stage_label}</Tag> : null}
        </span>
      ),
    },
    {
      title: t('deliveryRuns.col.since'),
      key: 'since',
      render: (_, r) => dayjs(r.internal_stage_at || r.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => {
        if (r.internal_stage === 'internal_shipping') {
          return (
            <Button size="small" type="primary" onClick={() => setStage(r.order_id, 'at_warehouse', 'deliveryRuns.arrived')}>
              {t('deliveryRuns.markArrived')}
            </Button>
          )
        }
        if (r.status !== 'out_for_delivery') {
          return (
            <Button size="small" onClick={() => setStage(r.order_id, 'internal_shipping', 'deliveryRuns.onTheWay')}>
              {t('deliveryRuns.markInternalShipping')}
            </Button>
          )
        }
        return null
      },
    },
  ]

  const selectable = tab !== 'internal_shipping' && Boolean(plannedRun)
  const addSelected = async () => {
    const done = await act(
      add.mutateAsync({ runId: plannedRun.id, orderIds: selected.map(Number) }),
      t('deliveryRuns.added', { count: selected.length, id: plannedRun.id }),
    )
    if (done) setSelected([])
  }

  const table = (rows) => (
    <Table
      rowKey="order_id"
      size="small"
      columns={columns}
      dataSource={shown(rows)}
      loading={query.isFetching}
      pagination={{ pageSize: 50, hideOnSinglePage: true }}
      scroll={{ x: true }}
      rowSelection={selectable ? { selectedRowKeys: selected, onChange: setSelected } : undefined}
      locale={{ emptyText: <Empty description={t('deliveryRuns.noneWaiting')} /> }}
    />
  )

  return (
    <Card
      title={t('deliveryRuns.waiting')}
      actions={
        <Space wrap>
          <Select
            allowClear
            placeholder={t('deliveryRuns.col.governorate')}
            className="min-w-40"
            value={governorate}
            onChange={setGovernorate}
            options={governorates.map((g) => ({ value: g, label: g }))}
          />
          {plannedRun ? (
            <Button type="primary" icon={<PlusOutlined />} disabled={!selected.length} loading={add.isPending} onClick={addSelected}>
              {t('deliveryRuns.addTo', { count: selected.length, id: plannedRun.id })}
            </Button>
          ) : null}
        </Space>
      }
    >
      {!plannedRun ? <Alert className="mb-3" type="info" showIcon message={t('deliveryRuns.pickPlanned')} /> : null}
      <Tabs
        activeKey={tab}
        onChange={(key) => {
          setTab(key)
          setSelected([])
        }}
        items={[
          { key: 'ready', label: `${t('deliveryRuns.tabs.ready')} (${shown(groups.ready).length})`, children: table(groups.ready) },
          {
            key: 'internal_shipping',
            label: `${t('deliveryRuns.tabs.internalShipping')} (${shown(groups.internal_shipping).length})`,
            children: (
              <>
                <p className="text-xs text-slate-500 mb-2">{t('deliveryRuns.internalShippingHint')}</p>
                {table(groups.internal_shipping)}
              </>
            ),
          },
          {
            key: 'out_not_delivered',
            label: `${t('deliveryRuns.tabs.outNotDelivered')} (${shown(groups.out_not_delivered).length})`,
            children: (
              <>
                <p className="text-xs text-slate-500 mb-2">{t('deliveryRuns.outNotDeliveredHint')}</p>
                {table(groups.out_not_delivered)}
              </>
            ),
          },
        ]}
      />
    </Card>
  )
}

export function DeliveryRunsPage() {
  const { t } = useTranslation('pages')
  const [day, setDay] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [runId, setRunId] = useState(null)
  const [creating, setCreating] = useState(false)
  const runsQuery = useDeliveryRuns(day)
  const runs = runsQuery.data ?? []
  const selectedRun = runs.find((r) => r.id === runId) ?? null

  const columns = [
    { title: t('deliveryRuns.col.run'), dataIndex: 'id', render: (id) => `#${id}` },
    { title: t('deliveryRuns.driver'), dataIndex: 'driver_name', render: (v) => v || t('deliveryRuns.noDriver') },
    {
      title: t('deliveryRuns.col.status'),
      key: 'status',
      render: (_, r) => <Tag color={RUN_STATUS_COLOR[r.status]}>{r.status_label}</Tag>,
    },
    {
      title: t('deliveryRuns.col.progress'),
      key: 'counts',
      render: (_, r) => t('deliveryRuns.countsLine', r.counts ?? {}),
    },
    { title: t('deliveryRuns.note'), dataIndex: 'note', render: (v) => v || '—' },
  ]

  return (
    <div className="space-y-4">
      <Card
        title={t('deliveryRuns.title')}
        actions={
          <Space wrap>
            <DatePicker
              allowClear={false}
              value={dayjs(day)}
              onChange={(d) => {
                setDay(d.format('YYYY-MM-DD'))
                setRunId(null)
              }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              {t('deliveryRuns.newRun')}
            </Button>
          </Space>
        }
      >
        <p className="text-sm text-slate-600 mb-3">{t('deliveryRuns.intro')}</p>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={runs}
          loading={runsQuery.isFetching}
          pagination={false}
          scroll={{ x: true }}
          rowClassName={(r) => (r.id === runId ? 'bg-sky-50' : 'cursor-pointer')}
          onRow={(r) => ({ onClick: () => setRunId(r.id) })}
          locale={{ emptyText: <Empty description={t('deliveryRuns.noRuns')} /> }}
        />
      </Card>

      {runId != null ? <RunDetail runId={runId} /> : null}

      <Candidates plannedRun={selectedRun?.status === 'planned' ? selectedRun : null} />

      <NewRunModal
        open={creating}
        day={day}
        onClose={() => setCreating(false)}
        onCreated={(run) => {
          setCreating(false)
          setDay(run.day)
          setRunId(run.id)
        }}
      />
    </div>
  )
}
