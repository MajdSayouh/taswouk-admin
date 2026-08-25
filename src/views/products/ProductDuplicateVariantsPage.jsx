// Read-only report: products, across every store, that have two or more variants sharing the
// exact same color/size/custom-option identity — duplicates that differ only in stock/images.
// Nothing here writes back to the API. See DASHBOARD_DATA_INTEGRITY_REPORT.md / the backend
// report doc for the bug that created these (fixed on the dashboard side, existing data isn't).
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Table, Progress, Alert, Tag, Input, Popconfirm, message } from 'antd'
import {
  emptyDuplicateVariantAuditProgress,
  scanDuplicateVariants,
  scanSingleProductForDuplicates,
} from '../../services/productDuplicateVariantAuditService.js'
import * as productService from '../../services/productService.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

/** Drops the deleted variant from its duplicate group; the group itself is dropped once it's
 * down to a single variant, since that's no longer a duplicate. */
function removeVariantFromMatches(matches, productId, variantId) {
  return matches
    .map((group) =>
      String(group.productId) === String(productId)
        ? { ...group, variants: group.variants.filter((v) => String(v.variantId) !== String(variantId)) }
        : group,
    )
    .filter((group) => group.variants.length >= 2)
}

export function ProductDuplicateVariantsPage() {
  const { t } = useTranslation('pages')
  const [status, setStatus] = useState('idle') // idle | running | completed | stopped | failed
  const [progress, setProgress] = useState(emptyDuplicateVariantAuditProgress)
  const [fatalError, setFatalError] = useState(null)
  const abortRef = useRef(/** @type {AbortController | null} */ (null))

  const [singleProductId, setSingleProductId] = useState('')
  const [singleStatus, setSingleStatus] = useState('idle') // idle | running | done | failed
  const [singleMatches, setSingleMatches] = useState([])
  const [singleError, setSingleError] = useState(null)

  const [deletingVariantId, setDeletingVariantId] = useState(null)

  async function handleDeleteVariant(productId, variantId) {
    setDeletingVariantId(variantId)
    try {
      await productService.deleteProductVariant(productId, variantId)
      setSingleMatches((prev) => removeVariantFromMatches(prev, productId, variantId))
      setProgress((prev) => ({
        ...prev,
        duplicateMatches: removeVariantFromMatches(prev.duplicateMatches, productId, variantId),
      }))
      message.success(t('products.duplicateVariants.deleteSuccess'))
    } catch (err) {
      const detail = String(err?.message ?? '')
      message.error(
        detail.includes('Cannot delete the last active variant of a product')
          ? t('products.variants.lastActiveRequired')
          : detail || t('products.duplicateVariants.deleteError'),
      )
    } finally {
      setDeletingVariantId(null)
    }
  }

  async function checkSingleProduct() {
    const pid = singleProductId.trim()
    if (!pid) return
    setSingleStatus('running')
    setSingleError(null)
    try {
      const matches = await scanSingleProductForDuplicates(pid)
      setSingleMatches(matches)
      setSingleStatus('done')
    } catch (err) {
      setSingleError(String(err?.message || t('products.duplicateVariants.fatalError')))
      setSingleStatus('failed')
    }
  }

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
      const result = await scanDuplicateVariants([], {
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

  function buildVariantDetailColumns(productId) {
    return [
      { title: t('products.duplicateVariants.colVariantId'), dataIndex: 'variantId', width: 120 },
      { title: t('products.duplicateVariants.colStock'), dataIndex: 'stockQuantity', width: 100 },
      { title: t('products.duplicateVariants.colImages'), dataIndex: 'imageCount', width: 90 },
      { title: t('products.duplicateVariants.colPrice'), dataIndex: 'price', width: 100 },
      { title: t('products.duplicateVariants.colVariantStatus'), dataIndex: 'status', width: 120 },
      {
        title: t('products.duplicateVariants.colAction'),
        width: 140,
        render: (_, record) => (
          <Popconfirm
            title={t('products.duplicateVariants.deleteConfirm')}
            onConfirm={() => handleDeleteVariant(productId, record.variantId)}
            okText={t('shared.yes')}
            cancelText={t('shared.no')}
          >
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 border-red-200 hover:bg-red-50"
              loading={deletingVariantId === record.variantId}
              disabled={deletingVariantId != null && deletingVariantId !== record.variantId}
            >
              {t('products.duplicateVariants.deleteAction')}
            </Button>
          </Popconfirm>
        ),
      },
    ]
  }

  return (
    <div className="space-y-6">
      <Card title={t('products.duplicateVariants.singleCheckTitle')}>
        <p className="text-sm text-slate-600 mb-3">
          {t('products.duplicateVariants.singleCheckDescription')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={singleProductId}
            onChange={(e) => setSingleProductId(e.target.value)}
            onPressEnter={checkSingleProduct}
            placeholder={t('products.duplicateVariants.singleCheckPlaceholder')}
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="primary"
            onClick={checkSingleProduct}
            disabled={singleStatus === 'running' || !singleProductId.trim()}
          >
            {t('products.duplicateVariants.singleCheckAction')}
          </Button>
        </div>
        {singleStatus === 'failed' && singleError ? (
          <Alert type="error" showIcon className="mt-3" message={singleError} />
        ) : null}
        {singleStatus === 'done' ? (
          <div className="mt-3">
            {singleMatches.length === 0 ? (
              <Alert
                type="success"
                showIcon
                message={t('products.duplicateVariants.singleCheckClean')}
              />
            ) : (
              <Table
                rowKey={(row) => `${row.color}-${row.size}-${row.customOptionsLabel}`}
                columns={columns.filter((c) => c.dataIndex !== 'productId' && c.dataIndex !== 'storeName')}
                dataSource={singleMatches}
                size="small"
                pagination={false}
                expandable={{
                  expandedRowRender: (row) => (
                    <Table
                      rowKey="variantId"
                      columns={buildVariantDetailColumns(row.productId)}
                      dataSource={row.variants}
                      size="small"
                      pagination={false}
                    />
                  ),
                }}
              />
            )}
          </div>
        ) : null}
      </Card>

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
        <p className="text-xs text-slate-400 mb-4">{t('products.duplicateVariants.scopeNoteAllStores')}</p>

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
            {t('products.duplicateVariants.resolvedStoresCount', { count: progress.stores.length })}
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
                columns={buildVariantDetailColumns(row.productId)}
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
