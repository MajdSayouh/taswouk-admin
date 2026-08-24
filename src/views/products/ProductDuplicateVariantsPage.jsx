// Read-only report: products (scoped to a fixed set of stores) that have two or more variants
// sharing the exact same color/size/custom-option identity — duplicates that differ only in
// stock. Nothing here writes back to the API.
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Table, Progress, Alert, Tag } from 'antd'
import {
  emptyDuplicateVariantAuditProgress,
  scanDuplicateVariants,
} from '../../services/productDuplicateVariantAuditService.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

// The two stores this report is scoped to — case/whitespace-insensitive substring match against
// the live store list, so partial names ("azzam") still resolve to the right store.
const TARGET_STORE_QUERIES = ['azzam', 'جنيد للمعاطف']

export function ProductDuplicateVariantsPage() {
  const { t } = useTranslation('pages')
  const [status, setStatus] = useState('idle') // idle | running | completed | stopped | failed
  const [progress, setProgress] = useState(emptyDuplicateVariantAuditProgress)
  const [fatalError, setFatalError] = useState(null)
  const abortRef = useRef(/** @type {AbortController | null} */ (null))

  const percent =
    status === 'completed'
      ? 100
      : progress.scannedProducts > 0
        ? Math.min(95, progress.scannedProducts) // no reliable cross-store total; just show motion
        : 0

  async function startScan() {
    if (status === 'running') return
    const controller = new AbortController()
    abortRef.current = controller
    setProgress(emptyDuplicateVariantAuditProgress())
    setFatalError(null)
    setStatus('running')
    try {
      const result = await scanDuplicateVariants(TARGET_STORE_QUERIES, {
        signal: controller.signal,
        onProgress: setProgress,
      })
      setProgress(result)
      setStatus('completed')
    } catch (err) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
        setStatus('stopped')
      } else {
        setFatalError(String(err?.message || t('products.duplicateVariants.fatalError')))
        setStatus('failed')
      }
    } finally {
      abortRef.current = null
    }
  }

  function stopScan() {
    abortRef.current?.abort()
  }

  const columns = [
    {
      title: t('products.duplicateVariants.colId'),
      dataIndex: 'productId',
      width: 90,
      render: (id) => (
        <Link className="text-[#FF7D29] hover:underline" to={`/products/${id}`}>
          #{id}
        </Link>
      ),
    },
    { title: t('products.duplicateVariants.colName'), dataIndex: 'name' },
    { title: t('products.duplicateVariants.colStore'), dataIndex: 'storeName', width: 160 },
    {
      title: t('products.duplicateVariants.colStatus'),
      dataIndex: 'isActive',
      width: 100,
      render: (isActive) =>
        isActive ? (
          <Tag color="green">{t('products.duplicateVariants.active')}</Tag>
        ) : (
          <Tag color="default">{t('products.duplicateVariants.inactive')}</Tag>
        ),
    },
    {
      title: t('products.duplicateVariants.colColor'),
      dataIndex: 'color',
      width: 120,
      render: (value) => value || '—',
    },
    {
      title: t('products.duplicateVariants.colSize'),
      dataIndex: 'size',
      width: 120,
      render: (value) => value || '—',
    },
    {
      title: t('products.duplicateVariants.colOptions'),
      dataIndex: 'customOptionsLabel',
      width: 160,
      render: (value) => value || '—',
    },
    {
      title: t('products.duplicateVariants.colDuplicateCount'),
      dataIndex: 'variants',
      width: 110,
      render: (variants) => variants.length,
    },
  ]

  const variantDetailColumns = [
    { title: t('products.duplicateVariants.colVariantId'), dataIndex: 'variantId', width: 120 },
    { title: t('products.duplicateVariants.colStock'), dataIndex: 'stockQuantity', width: 100 },
    { title: t('products.duplicateVariants.colPrice'), dataIndex: 'price', width: 100 },
    { title: t('products.duplicateVariants.colVariantStatus'), dataIndex: 'status', width: 120 },
  ]

  return (
    <div className="space-y-6">
      <Card
        title={t('products.duplicateVariants.title')}
        actions={
          status === 'running' ? (
            <Button type="button" variant="secondary" onClick={stopScan}>
              {t('products.duplicateVariants.stop')}
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={startScan}>
              {status === 'idle'
                ? t('products.duplicateVariants.start')
                : t('products.duplicateVariants.rescan')}
            </Button>
          )
        }
      >
        <p className="text-sm text-slate-600 mb-2">{t('products.duplicateVariants.description')}</p>
        <p className="text-xs text-slate-400 mb-4">
          {t('products.duplicateVariants.scopeNote', { stores: TARGET_STORE_QUERIES.join(' · ') })}
        </p>

        {status !== 'idle' ? (
          <div className="mb-4 space-y-2">
            <Progress
              percent={percent}
              showInfo={status === 'completed'}
              status={status === 'failed' ? 'exception' : undefined}
            />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>
                {t('products.duplicateVariants.scanned', { count: progress.scannedProducts })}
              </span>
              <span>
                {t('products.duplicateVariants.found', {
                  count: progress.duplicateMatches.length,
                })}
              </span>
              {progress.failedProducts > 0 ? (
                <span className="text-red-600">
                  {t('products.duplicateVariants.failedCount', { count: progress.failedProducts })}
                </span>
              ) : null}
            </div>
            {progress.currentStoreName ? (
              <div className="text-xs text-slate-400">
                {t('products.duplicateVariants.currentStore', { store: progress.currentStoreName })}
                {progress.currentProductId
                  ? ` — ${t('products.duplicateVariants.current', {
                      id: progress.currentProductId,
                      name: progress.currentProductName,
                    })}`
                  : ''}
              </div>
            ) : null}
          </div>
        ) : null}

        {progress.stores.length > 0 && status !== 'running' ? (
          <p className="text-xs text-slate-400 mb-2">
            {t('products.duplicateVariants.resolvedStores', {
              stores: progress.stores.map((s) => `${s.name} (#${s.id})`).join(' · '),
            })}
          </p>
        ) : null}
        {progress.unmatchedStoreQueries.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={t('products.duplicateVariants.unmatchedStores', {
              queries: progress.unmatchedStoreQueries.join(' · '),
            })}
          />
        ) : null}

        {status === 'stopped' ? (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message={t('products.duplicateVariants.stopped')}
          />
        ) : null}
        {fatalError ? <Alert type="error" showIcon className="mb-4" message={fatalError} /> : null}
      </Card>

      <Card
        title={t('products.duplicateVariants.resultsTitle', {
          count: progress.duplicateMatches.length,
        })}
      >
        <Table
          rowKey={(row) => `${row.productId}-${row.color}-${row.size}-${row.customOptionsLabel}`}
          columns={columns}
          dataSource={progress.duplicateMatches}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: t('products.duplicateVariants.noResultsYet') }}
          expandable={{
            expandedRowRender: (row) => (
              <Table
                rowKey="variantId"
                columns={variantDetailColumns}
                dataSource={row.variants}
                size="small"
                pagination={false}
              />
            ),
          }}
        />
      </Card>
    </div>
  )
}
