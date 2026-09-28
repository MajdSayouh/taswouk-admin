// Reusable UI component: Excel price sheet export/import buttons plus the import report.
// Shared by the store edit page (/api/stores/{id}/prices/*) and the legacy mall products
// section (/api/malls/{id}/prices/*) — both return the same report shape.
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Descriptions, Modal, Table, message } from 'antd'
import { Button } from '../ui/Button.jsx'

// The backend accepts .xlsx/.xlsm only (400 otherwise), so .xls is not offered.
const SHEET_ACCEPT =
  '.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12'

const REPORT_COUNTS = [
  ['total_rows', 'stores.prices.totalRows'],
  ['updated', 'stores.prices.updated'],
  ['created', 'stores.prices.created'],
  ['linked', 'stores.prices.linked'],
  ['unchanged', 'stores.prices.unchanged'],
  ['skipped', 'stores.prices.skipped'],
  ['variants_updated', 'stores.prices.variantsUpdated'],
]

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * @param {{
 *   exportPrices: () => Promise<{ blob: Blob, filename: string | null }>
 *   importPrices: (file: File) => Promise<Record<string, unknown> | null | undefined>
 *   fallbackFilename: string
 *   onImported?: () => void
 * }} props
 */
export function PriceSheetActions({ exportPrices, importPrices, fallbackFilename, onImported }) {
  const { t } = useTranslation('pages')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState(/** @type {Record<string, unknown> | null} */ (null))
  const importInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  async function handleExport() {
    setExporting(true)
    try {
      const { blob, filename } = await exportPrices()
      downloadBlob(blob, filename || fallbackFilename)
    } catch (e) {
      message.error(e?.message ?? t('stores.prices.exportErr'))
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFileChosen(e) {
    const file = e.target.files?.[0] ?? null
    e.target.value = '' // allow re-selecting the same file name next time
    if (!file) return
    setImporting(true)
    try {
      const result = await importPrices(file)
      const errors = Array.isArray(result?.errors) ? result.errors : []
      if (errors.length > 0) {
        message.warning(t('stores.prices.importedWithErrors', { count: errors.length }))
      } else {
        message.success(t('stores.prices.importSuccess'))
      }
      // A 200 without a body still means the sheet went in; there is just no report to show.
      if (result && typeof result === 'object') setReport(result)
      onImported?.()
    } catch (err) {
      message.error(err?.message ?? t('stores.prices.importErr'))
    } finally {
      setImporting(false)
    }
  }

  // Two errors can share a row number, so the index keys them.
  const errors = (Array.isArray(report?.errors) ? report.errors : []).map((row, i) => ({
    ...row,
    key: i,
  }))

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept={SHEET_ACCEPT}
        className="hidden"
        onChange={handleImportFileChosen}
      />
      <Button type="button" variant="secondary" loading={exporting} onClick={handleExport}>
        {t('stores.prices.export')}
      </Button>
      <Button
        type="button"
        variant="secondary"
        loading={importing}
        onClick={() => importInputRef.current?.click()}
      >
        {t('stores.prices.import')}
      </Button>

      <Modal
        title={t('stores.prices.reportTitle')}
        open={report != null}
        onCancel={() => setReport(null)}
        footer={
          <Button type="button" onClick={() => setReport(null)}>
            {t('stores.prices.close')}
          </Button>
        }
        width={720}
        destroyOnHidden
      >
        <Descriptions column={2} size="small" bordered>
          {REPORT_COUNTS.map(([key, labelKey]) => (
            <Descriptions.Item key={key} label={t(labelKey)}>
              <span className="tabular-nums">{Number(report?.[key] ?? 0)}</span>
            </Descriptions.Item>
          ))}
        </Descriptions>
        <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-900">
          {t('stores.prices.errorsTitle', { count: errors.length })}
        </h3>
        {errors.length > 0 ? (
          <Table
            rowKey="key"
            size="small"
            dataSource={errors}
            pagination={errors.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
            columns={[
              {
                title: t('stores.prices.colRow'),
                dataIndex: 'row',
                key: 'row',
                width: 70,
                render: (v) => <span className="tabular-nums">{v}</span>,
              },
              { title: t('stores.prices.colReason'), dataIndex: 'reason', key: 'reason' },
              {
                title: t('stores.prices.colRaw'),
                dataIndex: 'raw',
                key: 'raw',
                render: (v) => (
                  <span className="font-mono text-xs text-slate-600 break-all">{v || t('shared.emDash')}</span>
                ),
              },
            ]}
          />
        ) : (
          <p className="text-sm text-slate-500">{t('stores.prices.noErrors')}</p>
        )}
      </Modal>
    </>
  )
}
