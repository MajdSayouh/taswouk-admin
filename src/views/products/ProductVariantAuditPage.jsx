// Finds products whose only variant is a bare "ستاندر"/"ستاندر" (no-option) placeholder.
// "Start scan" is read-only. "Scan & delete directly" (after one confirmation) deletes each
// match's variant the moment it's found during the same pass — never the product itself. A
// separate two-step cleanup (dry run / delete) is also available for matches from a prior
// read-only scan. Always ends with a report of what was deleted/skipped/failed.
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Table, Progress, Alert, Tag, Modal } from 'antd'
import {
  emptyProductVariantAuditProgress,
  emptyVariantCleanupReport,
  scanProductVariantAudit,
  deleteBareStandardVariants,
} from '../../services/productVariantAuditService.js'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const CLEANUP_REASON_LABEL_KEYS = {
  not_single_variant_anymore: 'products.variantAudit.cleanupReasonMultiVariant',
  changed_since_scan: 'products.variantAudit.cleanupReasonChanged',
  no_variant_id: 'products.variantAudit.cleanupReasonNoId',
}

export function ProductVariantAuditPage() {
  const { t } = useTranslation('pages')
  const [status, setStatus] = useState('idle') // idle | running | completed | stopped | failed
  const [progress, setProgress] = useState(emptyProductVariantAuditProgress)
  const [fatalError, setFatalError] = useState(null)
  const abortRef = useRef(/** @type {AbortController | null} */ (null))

  const [directDeleteConfirmOpen, setDirectDeleteConfirmOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cleanupStatus, setCleanupStatus] = useState('idle') // idle | running | completed | stopped | failed
  const [cleanupReport, setCleanupReport] = useState(emptyVariantCleanupReport)
  const [cleanupFatalError, setCleanupFatalError] = useState(null)
  const cleanupAbortRef = useRef(/** @type {AbortController | null} */ (null))

  const percent =
    progress.totalProducts > 0
      ? Math.min(100, Math.round((progress.scannedProducts / progress.totalProducts) * 100))
      : status === 'completed'
        ? 100
        : 0

  const cleanupPercent =
    cleanupReport.total > 0 ? Math.round((cleanupReport.processed / cleanupReport.total) * 100) : 0

  // Each variant call is throttled to one per ~200ms (see productService's variant request
  // queue) — at 1000+ products that adds up, so surface a rough estimate rather than let the
  // scan/cleanup look stalled. Real network latency usually dominates the floor, so this is a
  // minimum, not a promise.
  function estimatedMinutes(requestCount) {
    return Math.max(1, Math.ceil((requestCount * 0.2) / 60))
  }

  async function startScan(deleteImmediately = false) {
    if (status === 'running') return
    setDirectDeleteConfirmOpen(false)
    const controller = new AbortController()
    abortRef.current = controller
    setProgress(emptyProductVariantAuditProgress())
    setFatalError(null)
    setStatus('running')
    setCleanupStatus('idle')
    setCleanupReport(emptyVariantCleanupReport())
    setCleanupFatalError(null)
    try {
      const result = await scanProductVariantAudit({
        signal: controller.signal,
        onProgress: setProgress,
        deleteImmediately,
      })
      setProgress(result)
      setStatus('completed')
    } catch (err) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
        setStatus('stopped')
      } else {
        setFatalError(String(err?.message || t('products.variantAudit.fatalError')))
        setStatus('failed')
      }
    } finally {
      abortRef.current = null
    }
  }

  function stopScan() {
    abortRef.current?.abort()
  }

  async function runCleanup(dryRun) {
    setConfirmOpen(false)
    const controller = new AbortController()
    cleanupAbortRef.current = controller
    setCleanupReport(emptyVariantCleanupReport())
    setCleanupFatalError(null)
    setCleanupStatus('running')
    try {
      const result = await deleteBareStandardVariants(progress.standardBothMatches, {
        signal: controller.signal,
        onProgress: setCleanupReport,
        dryRun,
      })
      setCleanupReport(result)
      setCleanupStatus('completed')
    } catch (err) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
        setCleanupStatus('stopped')
      } else {
        setCleanupFatalError(String(err?.message || t('products.variantAudit.cleanupFatalError')))
        setCleanupStatus('failed')
      }
    } finally {
      cleanupAbortRef.current = null
    }
  }

  function stopCleanup() {
    cleanupAbortRef.current?.abort()
  }

  /** Client-side CSV export of the scanned matches — a review copy outside the paginated table,
   * useful at hundreds/thousands of rows before committing to a real delete run. */
  function exportMatchesCsv() {
    const rows = progress.standardBothMatches
    const header = ['product_id', 'name', 'is_active', 'variant_count', 'variant_id']
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [
      header.join(','),
      ...rows.map((row) =>
        [row.productId, row.name, row.isActive, row.variantCount, row.variantId]
          .map(escape)
          .join(','),
      ),
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `standard-both-variants-${rows.length}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const standardBothColumns = [
    {
      title: t('products.variantAudit.colId'),
      dataIndex: 'productId',
      width: 90,
      render: (id) => (
        <Link className="text-[#FF7D29] hover:underline" to={`/products/${id}`}>
          #{id}
        </Link>
      ),
    },
    { title: t('products.variantAudit.colName'), dataIndex: 'name' },
    {
      title: t('products.variantAudit.colStatus'),
      dataIndex: 'isActive',
      width: 110,
      render: (isActive) =>
        isActive ? (
          <Tag color="green">{t('products.variantAudit.active')}</Tag>
        ) : (
          <Tag color="default">{t('products.variantAudit.inactive')}</Tag>
        ),
    },
    { title: t('products.variantAudit.colVariantCount'), dataIndex: 'variantCount', width: 130 },
    ...(progress.standardBothMatches.some((row) => row.deleted !== undefined)
      ? [
          {
            title: t('products.variantAudit.colDeleteResult'),
            dataIndex: 'deleted',
            width: 130,
            render: (deleted, row) =>
              deleted ? (
                <Tag color="green">{t('products.variantAudit.tagDeleted')}</Tag>
              ) : (
                <Tag color="red" title={row.deleteError}>
                  {t('products.variantAudit.tagDeleteFailed')}
                </Tag>
              ),
          },
        ]
      : []),
  ]

  const cleanupResultColumns = (extraColumn) => [
    {
      title: t('products.variantAudit.colId'),
      dataIndex: 'productId',
      width: 90,
      render: (id) => (
        <Link className="text-[#FF7D29] hover:underline" to={`/products/${id}`}>
          #{id}
        </Link>
      ),
    },
    { title: t('products.variantAudit.colName'), dataIndex: 'name' },
    extraColumn,
  ].filter(Boolean)

  const deletedColumns = cleanupResultColumns({
    title: t('products.variantAudit.colVariantId'),
    dataIndex: 'variantId',
    width: 130,
  })
  const skippedColumns = cleanupResultColumns({
    title: t('products.variantAudit.colReason'),
    dataIndex: 'reason',
    render: (reason) => t(CLEANUP_REASON_LABEL_KEYS[reason] ?? 'products.variantAudit.cleanupReasonChanged'),
  })
  const failedColumns = cleanupResultColumns({
    title: t('products.variantAudit.colError'),
    dataIndex: 'message',
  })

  const canDelete =
    status === 'completed' && progress.standardBothMatches.length > 0 && cleanupStatus !== 'running'

  return (
    <div className="space-y-6">
      <Card
        title={t('products.variantAudit.title')}
        actions={
          status === 'running' ? (
            <Button type="button" variant="secondary" onClick={stopScan}>
              {t('products.variantAudit.stop')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setDirectDeleteConfirmOpen(true)}>
                {t('products.variantAudit.startAndDelete')}
              </Button>
              <Button type="button" variant="primary" onClick={() => startScan(false)}>
                {status === 'idle'
                  ? t('products.variantAudit.start')
                  : t('products.variantAudit.rescan')}
              </Button>
            </>
          )
        }
      >
        <p className="text-sm text-slate-600 mb-4">{t('products.variantAudit.description')}</p>
        {status === 'idle' ? (
          <p className="text-xs text-slate-400 mb-4">{t('products.variantAudit.rateLimitNote')}</p>
        ) : null}

        {status !== 'idle' ? (
          <div className="mb-4 space-y-2">
            <Progress percent={percent} status={status === 'failed' ? 'exception' : undefined} />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>{t('products.variantAudit.scanned', { count: progress.scannedProducts })}</span>
              <span>
                {t('products.variantAudit.standardBothFound', {
                  count: progress.standardBothMatches.length,
                })}
              </span>
              {progress.deletedCount > 0 ? (
                <span className="text-green-700">
                  {t('products.variantAudit.cleanupDeleted', { count: progress.deletedCount })}
                </span>
              ) : null}
              {progress.deleteFailedCount > 0 ? (
                <span className="text-red-600">
                  {t('products.variantAudit.cleanupFailed', { count: progress.deleteFailedCount })}
                </span>
              ) : null}
              {progress.failedProducts > 0 ? (
                <span className="text-red-600">
                  {t('products.variantAudit.failedCount', { count: progress.failedProducts })}
                </span>
              ) : null}
            </div>
            {progress.currentProductId ? (
              <div className="text-xs text-slate-400">
                {t('products.variantAudit.current', {
                  id: progress.currentProductId,
                  name: progress.currentProductName,
                })}
              </div>
            ) : null}
            {status === 'running' && progress.totalProducts > 0 ? (
              <div className="text-xs text-slate-400">
                {t('products.variantAudit.estimatedRemaining', {
                  minutes: estimatedMinutes(
                    Math.max(0, progress.totalProducts - progress.scannedProducts),
                  ),
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {status === 'stopped' ? (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message={t('products.variantAudit.stopped')}
          />
        ) : null}
        {fatalError ? (
          <Alert type="error" showIcon className="mb-4" message={fatalError} />
        ) : null}
      </Card>

      <Card
        title={t('products.variantAudit.standardBothTitle', {
          count: progress.standardBothMatches.length,
        })}
        actions={
          progress.standardBothMatches.length > 0 ? (
            cleanupStatus === 'running' ? (
              <Button type="button" variant="secondary" onClick={stopCleanup}>
                {t('products.variantAudit.cleanupStop')}
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={exportMatchesCsv}>
                  {t('products.variantAudit.exportCsv')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canDelete}
                  onClick={() => runCleanup(true)}
                >
                  {t('products.variantAudit.cleanupDryRun')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canDelete}
                  onClick={() => setConfirmOpen(true)}
                >
                  {t('products.variantAudit.cleanupStart')}
                </Button>
              </>
            )
          ) : null
        }
      >
        <p className="text-sm text-slate-500 mb-3">
          {t('products.variantAudit.standardBothDescription')}
        </p>
        <Table
          rowKey="productId"
          columns={standardBothColumns}
          dataSource={progress.standardBothMatches}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: t('products.variantAudit.noResultsYet') }}
        />
      </Card>

      {cleanupStatus !== 'idle' ? (
        <Card
          title={
            cleanupReport.dryRun
              ? t('products.variantAudit.cleanupReportTitleDryRun')
              : t('products.variantAudit.cleanupReportTitle')
          }
        >
          <div className="mb-4 space-y-2">
            <Progress
              percent={cleanupPercent}
              status={cleanupStatus === 'failed' ? 'exception' : undefined}
            />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>
                {t('products.variantAudit.cleanupProcessed', {
                  processed: cleanupReport.processed,
                  total: cleanupReport.total,
                })}
              </span>
              <span className="text-green-700">
                {t(
                  cleanupReport.dryRun
                    ? 'products.variantAudit.cleanupWouldDelete'
                    : 'products.variantAudit.cleanupDeleted',
                  { count: cleanupReport.deleted.length },
                )}
              </span>
              <span className="text-slate-500">
                {t('products.variantAudit.cleanupAlreadyDone', {
                  count: cleanupReport.alreadyDone.length,
                })}
              </span>
              <span className="text-amber-700">
                {t('products.variantAudit.cleanupSkipped', { count: cleanupReport.skipped.length })}
              </span>
              {cleanupReport.failed.length > 0 ? (
                <span className="text-red-600">
                  {t('products.variantAudit.cleanupFailed', { count: cleanupReport.failed.length })}
                </span>
              ) : null}
            </div>
            {cleanupReport.currentProductId ? (
              <div className="text-xs text-slate-400">
                {t('products.variantAudit.current', {
                  id: cleanupReport.currentProductId,
                  name: cleanupReport.currentProductName,
                })}
              </div>
            ) : null}
          </div>

          {cleanupStatus === 'stopped' ? (
            <Alert
              type="info"
              showIcon
              className="mb-4"
              message={t('products.variantAudit.cleanupStopped')}
            />
          ) : null}
          {cleanupStatus === 'completed' ? (
            <Alert
              type="success"
              showIcon
              className="mb-4"
              message={t(
                cleanupReport.dryRun
                  ? 'products.variantAudit.cleanupCompletedDryRun'
                  : 'products.variantAudit.cleanupCompleted',
              )}
            />
          ) : null}
          {cleanupFatalError ? (
            <Alert type="error" showIcon className="mb-4" message={cleanupFatalError} />
          ) : null}

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                {t(
                  cleanupReport.dryRun
                    ? 'products.variantAudit.cleanupWouldDeleteTitle'
                    : 'products.variantAudit.cleanupDeletedTitle',
                  { count: cleanupReport.deleted.length },
                )}
              </h3>
              <Table
                rowKey="productId"
                columns={deletedColumns}
                dataSource={cleanupReport.deleted}
                size="small"
                pagination={{ pageSize: 20 }}
                locale={{ emptyText: t('products.variantAudit.noResultsYet') }}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                {t('products.variantAudit.cleanupAlreadyDoneTitle', {
                  count: cleanupReport.alreadyDone.length,
                })}
              </h3>
              <Table
                rowKey="productId"
                columns={cleanupResultColumns(null)}
                dataSource={cleanupReport.alreadyDone}
                size="small"
                pagination={{ pageSize: 20 }}
                locale={{ emptyText: t('products.variantAudit.noResultsYet') }}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                {t('products.variantAudit.cleanupSkippedTitle', {
                  count: cleanupReport.skipped.length,
                })}
              </h3>
              <Table
                rowKey="productId"
                columns={skippedColumns}
                dataSource={cleanupReport.skipped}
                size="small"
                pagination={{ pageSize: 20 }}
                locale={{ emptyText: t('products.variantAudit.noResultsYet') }}
              />
            </div>
            {cleanupReport.failed.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  {t('products.variantAudit.cleanupFailedTitle', {
                    count: cleanupReport.failed.length,
                  })}
                </h3>
                <Table
                  rowKey="productId"
                  columns={failedColumns}
                  dataSource={cleanupReport.failed}
                  size="small"
                  pagination={{ pageSize: 20 }}
                />
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Modal
        open={directDeleteConfirmOpen}
        title={t('products.variantAudit.startAndDeleteConfirmTitle')}
        onCancel={() => setDirectDeleteConfirmOpen(false)}
        onOk={() => startScan(true)}
        okText={t('products.variantAudit.cleanupConfirmOk')}
        cancelText={t('products.variantAudit.cleanupConfirmCancel')}
        okButtonProps={{ danger: true }}
      >
        <p>{t('products.variantAudit.startAndDeleteConfirmBody')}</p>
      </Modal>

      <Modal
        open={confirmOpen}
        title={t('products.variantAudit.cleanupConfirmTitle')}
        onCancel={() => setConfirmOpen(false)}
        onOk={() => runCleanup(false)}
        okText={t('products.variantAudit.cleanupConfirmOk')}
        cancelText={t('products.variantAudit.cleanupConfirmCancel')}
        okButtonProps={{ danger: true }}
      >
        <p>
          {t('products.variantAudit.cleanupConfirmBody', {
            count: progress.standardBothMatches.length,
          })}
        </p>
        <p className="mt-2 text-slate-500 text-sm">
          {t('products.variantAudit.estimatedRemaining', {
            minutes: estimatedMinutes(progress.standardBothMatches.length * 2),
          })}
        </p>
      </Modal>
    </div>
  )
}
