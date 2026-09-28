/**
 * Excel price sheet round trip (admin) — shared by the store and legacy mall routes:
 * `GET …/prices/export` returns an .xlsx, `POST …/prices/import` takes it back as multipart `file`.
 */
import { apiClient } from './apiClient.js'

function isFileLike(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    ((typeof File !== 'undefined' && value instanceof File) ||
      (typeof Blob !== 'undefined' && value instanceof Blob))
  )
}

function multipartConfig() {
  return {
    transformRequest: [
      (body, headers) => {
        if (body instanceof FormData) {
          delete headers['Content-Type']
        }
        return body
      },
    ],
  }
}

/**
 * GET an .xlsx export as a blob, with the server's file name when it sends one.
 * @param {string} path
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ blob: Blob, filename: string | null }>}
 */
export async function exportPriceSheet(path, options = {}) {
  const { data, headers } = await apiClient.get(path, {
    responseType: 'blob',
    skipGlobalErrorMessage: true,
    signal: options.signal,
  })
  if (!(data instanceof Blob)) throw new Error('Invalid export response')
  const type = data.type || ''
  // Errors can come back as a JSON/HTML body mislabeled by responseType: 'blob'.
  if (type.includes('application/json') || type.includes('text/html') || type.includes('text/plain')) {
    const text = await data.text()
    let msg = text.slice(0, 200)
    try {
      const j = JSON.parse(text)
      if (typeof j.detail === 'string') msg = j.detail
      else if (typeof j.message === 'string') msg = j.message
    } catch {
      /* keep truncated body */
    }
    throw new Error(msg || 'Could not export prices')
  }
  if (data.size === 0) throw new Error('Empty export response')
  const disposition = String(headers?.['content-disposition'] ?? '')
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : null
  return { blob: data, filename }
}

/**
 * POST an edited sheet back as multipart `file`.
 * @param {string} path
 * @param {File | Blob} file
 * @returns {Promise<{
 *   total_rows?: number, updated?: number, created?: number, linked?: number,
 *   unchanged?: number, skipped?: number, variants_updated?: number,
 *   errors?: { row: number, reason: string, raw: string }[]
 * }>}
 */
export async function importPriceSheet(path, file) {
  if (!isFileLike(file)) throw new Error('File must be a file')
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await apiClient.post(path, fd, multipartConfig())
  return data
}
