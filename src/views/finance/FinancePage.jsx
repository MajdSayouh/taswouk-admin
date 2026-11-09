// Finance: costs of past orders, and the ledger of delivery income and operating costs.
// Everything entered here reaches the accounting system through /api/stats.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
  Upload,
  message,
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { queryKeys } from '../../query/queryKeys.js'
import {
  createFinancialEntry,
  enterOrderCost,
  getFinanceDrivers,
  getFinancialEntries,
  getOrderFinance,
  getOrdersAwaitingCost,
  importOrderCosts,
  voidFinancialEntry,
} from '../../services/financeService.js'
import { formatSyp } from '../../utils/externalOrder.js'

const KINDS = ['delivery_income', 'delivery_cost', 'maintenance', 'other']

function OrderCostCard() {
  const { t } = useTranslation('pages')
  const [orderId, setOrderId] = useState(/** @type {number | null} */ (null))
  const [finance, setFinance] = useState(/** @type {any} */ (null))
  const [mode, setMode] = useState('purchase')
  const [value, setValue] = useState(/** @type {number | null} */ (null))
  const [error, setError] = useState('')
  const [scope, setScope] = useState('global')
  const queryClient = useQueryClient()
  const awaiting = useQuery({
    queryKey: queryKeys.finance.awaitingCost(scope),
    queryFn: ({ signal }) => getOrdersAwaitingCost(scope, { signal }),
  })
  const refreshAwaiting = () => queryClient.invalidateQueries({ queryKey: ['finance', 'awaitingCost'] })

  async function run(action) {
    setError('')
    try {
      return await action()
    } catch (err) {
      setError(err?.message ?? t('finance.failed'))
      return undefined
    }
  }

  async function lookup(id = orderId) {
    if (id == null) return
    setOrderId(id)
    setFinance(null)
    setValue(null)
    const data = await run(() => getOrderFinance(id))
    if (data) setFinance(data)
  }

  // Sale − cost = profit, so the same subtraction yields whichever one was not typed.
  const derived = finance && value != null ? finance.sale_amount - value : null

  function save() {
    Modal.confirm({
      title: t('finance.confirmCost', { id: finance.order_id }),
      content: t('finance.finalWarning'),
      okText: t('finance.confirmOk'),
      cancelText: t('finance.cancel'),
      onOk: async () => {
        const key = mode === 'purchase' ? 'purchase_amount' : 'profit_amount'
        const data = await run(() => enterOrderCost(finance.order_id, { [key]: String(value) }))
        if (data) {
          setFinance(data)
          setValue(null)
          refreshAwaiting()
          message.success(t('finance.saved'))
        }
      },
    })
  }

  async function importFile(file) {
    const data = await run(() => importOrderCosts(file))
    if (data) {
      refreshAwaiting()
      message.success(t('finance.imported', { count: data.imported }))
    }
    return Upload.LIST_IGNORE
  }

  return (
    <Card title={t('finance.costsTitle')}>
      <p className="text-sm text-slate-600 mb-4 max-w-2xl">{t('finance.costsIntro')}</p>
      {error ? (
        <Alert type="error" showIcon className="mb-4" title={<span className="whitespace-pre-line">{error}</span>} />
      ) : null}
      <div className="flex flex-wrap gap-2 mb-4">
        <InputNumber min={1} precision={0} placeholder={t('finance.orderNumber')} value={orderId} onChange={setOrderId} />
        <Button onClick={() => lookup()}>{t('finance.lookup')}</Button>
        <Upload accept=".xlsx" showUploadList={false} beforeUpload={importFile}>
          <Button icon={<UploadOutlined />}>{t('finance.importCosts')}</Button>
        </Upload>
      </div>
      <p className="text-xs text-slate-500 mb-4">{t('finance.importHint')}</p>
      {finance ? (
        <div className="max-w-xl space-y-3">
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label={t('finance.store')}>{finance.store_name}</Descriptions.Item>
            <Descriptions.Item label={t('finance.sale')}>{formatSyp(finance.sale_amount)}</Descriptions.Item>
            <Descriptions.Item label={t('finance.purchase')}>
              {finance.purchase_amount == null ? '—' : formatSyp(finance.purchase_amount)}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.profit')}>
              {finance.profit_amount == null ? '—' : formatSyp(finance.profit_amount)}
            </Descriptions.Item>
          </Descriptions>
          {finance.can_enter_cost ? (
            <>
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                <Radio value="purchase">{t('finance.enterPurchase')}</Radio>
                <Radio value="profit">{t('finance.enterProfit')}</Radio>
              </Radio.Group>
              <InputNumber
                className="w-full"
                precision={2}
                min={mode === 'purchase' ? 0 : undefined}
                value={value}
                onChange={setValue}
                addonAfter="SYP"
              />
              {derived != null ? (
                <p className="text-sm text-slate-600">
                  {t(mode === 'purchase' ? 'finance.profit' : 'finance.purchase')}: {formatSyp(derived)}
                </p>
              ) : null}
              <Button type="primary" disabled={value == null} onClick={save}>
                {t('finance.save')}
              </Button>
            </>
          ) : (
            <Alert type="info" showIcon title={t('finance.costNotEditable')} />
          )}
        </div>
      ) : null}
      <h4 className="text-sm font-semibold text-slate-800 mt-6 mb-2">
        {t('finance.awaitingTitle', { count: awaiting.data?.count ?? 0 })}
      </h4>
      <Radio.Group className="mb-3" value={scope} onChange={(e) => setScope(e.target.value)}>
        <Radio value="global">{t('finance.scopeGlobal')}</Radio>
        <Radio value="all">{t('finance.scopeAll')}</Radio>
      </Radio.Group>
      {awaiting.isError ? <Alert type="error" showIcon className="mb-4" title={awaiting.error?.message} /> : null}
      <Table
        rowKey="order_id"
        size="small"
        loading={awaiting.isLoading}
        dataSource={awaiting.data?.items ?? []}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty description={t('finance.awaitingEmpty')} /> }}
        columns={[
          { title: t('finance.orderNumber'), dataIndex: 'order_id', render: (id) => `#${id}` },
          { title: t('finance.store'), dataIndex: 'store_name' },
          { title: t('finance.sale'), dataIndex: 'sale_amount', render: formatSyp },
          {
            title: t('finance.deliveredAt'),
            dataIndex: 'delivered_at',
            render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
          },
          {
            title: '',
            key: 'action',
            render: (_, r) => (
              <Button size="small" onClick={() => lookup(r.order_id)}>
                {t('finance.enterCostAction')}
              </Button>
            ),
          },
        ]}
      />
    </Card>
  )
}

function LedgerCard() {
  const { t } = useTranslation('pages')
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const entries = useQuery({
    queryKey: queryKeys.finance.entries(),
    queryFn: ({ signal }) => getFinancialEntries({ signal }),
  })
  const drivers = useQuery({
    queryKey: queryKeys.finance.drivers(),
    queryFn: ({ signal }) => getFinanceDrivers({ signal }),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.finance.entries() })
  const create = useMutation({ mutationFn: createFinancialEntry, onSuccess: refresh })
  const voidEntry = useMutation({ mutationFn: voidFinancialEntry, onSuccess: refresh })
  const kind = Form.useWatch('kind', form)

  async function onFinish(values) {
    try {
      await create.mutateAsync({
        kind: values.kind,
        amount: String(values.amount),
        entry_date: values.entryDate.format('YYYY-MM-DD'),
        details: values.details ?? '',
        order_id: values.orderId ?? null,
        driver_id: values.driverId ?? null,
      })
      message.success(t('finance.saved'))
      form.resetFields()
    } catch (err) {
      message.error(err?.message ?? t('finance.failed'))
    }
  }

  function confirmVoid(entry) {
    Modal.confirm({
      title: t('finance.voidConfirm'),
      okText: t('finance.confirmOk'),
      cancelText: t('finance.cancel'),
      onOk: () =>
        voidEntry.mutateAsync(entry.id).catch((err) => message.error(err?.message ?? t('finance.failed'))),
    })
  }

  const columns = [
    { title: t('finance.date'), dataIndex: 'entry_date' },
    { title: t('finance.kind'), dataIndex: 'kind', render: (v) => t(`finance.kinds.${v}`) },
    { title: t('finance.amount'), dataIndex: 'amount', render: formatSyp },
    { title: t('finance.details'), dataIndex: 'details', render: (v) => v || '—' },
    { title: t('finance.orderNumber'), dataIndex: 'order_id', render: (v) => (v ? `#${v}` : '—') },
    { title: t('finance.driverId'), dataIndex: 'driver_id', render: (v) => (v ? `#${v}` : '—') },
    { title: t('finance.enteredBy'), dataIndex: 'created_by_name' },
    {
      title: '',
      key: 'action',
      render: (_, r) =>
        r.voided_at ? (
          <Tag>{t('finance.voided')}</Tag>
        ) : (
          <Button size="small" danger onClick={() => confirmVoid(r)}>
            {t('finance.void')}
          </Button>
        ),
    },
  ]

  return (
    <Card title={t('finance.ledgerTitle')}>
      <p className="text-sm text-slate-600 mb-4 max-w-2xl">{t('finance.ledgerIntro')}</p>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        className="max-w-xl mb-6"
        initialValues={{ entryDate: dayjs() }}
      >
        <Form.Item name="kind" label={t('finance.kind')} rules={[{ required: true, message: t('finance.required') }]}>
          <Select options={KINDS.map((value) => ({ value, label: t(`finance.kinds.${value}`) }))} />
        </Form.Item>
        <Form.Item name="amount" label={t('finance.amount')} rules={[{ required: true, message: t('finance.required') }]}>
          <InputNumber className="w-full" min={0.01} precision={2} addonAfter="SYP" />
        </Form.Item>
        <Form.Item name="entryDate" label={t('finance.date')} rules={[{ required: true, message: t('finance.required') }]}>
          <DatePicker className="w-full" disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
        </Form.Item>
        <Form.Item
          name="details"
          label={t('finance.details')}
          rules={kind === 'other' ? [{ required: true, whitespace: true, message: t('finance.required') }] : []}
        >
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
        <Form.Item name="orderId" label={t('finance.orderOptional')}>
          <InputNumber className="w-full" min={1} precision={0} />
        </Form.Item>
        <Form.Item name="driverId" label={t('finance.driverOptional')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={drivers.isLoading}
            options={(drivers.data ?? []).map((d) => ({ value: d.id, label: `${d.name} (#${d.id})` }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={create.isPending}>
          {t('finance.addEntry')}
        </Button>
      </Form>
      {entries.isError ? <Alert type="error" showIcon className="mb-4" title={entries.error?.message} /> : null}
      <Table
        rowKey="id"
        size="small"
        loading={entries.isLoading}
        columns={columns}
        dataSource={entries.data?.items ?? []}
        pagination={false}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty description={t('finance.empty')} /> }}
      />
    </Card>
  )
}

export function FinancePage() {
  return (
    <div className="space-y-6">
      <LedgerCard />
      <OrderCostCard />
    </div>
  )
}
