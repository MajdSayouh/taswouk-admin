/**
 * Product images are served under **`/media/...`**, not under `/api/products/{filename}`
 * (that route is `GET /api/products/{product_id:int}`).
 *
 * Stored paths look like `products/logo.png` → request **`/media/products/logo.png`**
 * → full URL `https://test.taswouk.com/media/products/logo.png`.
 *
 * Override with `VITE_PRODUCT_IMAGE_GET_PATH_TEMPLATE` (placeholders: `{path}`, `{basename}`, `{productId}`).
 */

const DEFAULT_HOST = 'https://test.taswouk.com'

function mediaBaseUrl() {
  const fromMedia = import.meta.env.VITE_PUBLIC_MEDIA_BASE_URL
  if (fromMedia != null && String(fromMedia).trim() !== '') {
    return String(fromMedia).trim().replace(/\/$/, '')
  }
  const fromApi = import.meta.env.VITE_API_BASE_URL
  if (fromApi != null && String(fromApi).trim() !== '') {
    return String(fromApi).trim().replace(/\/$/, '')
  }
  return DEFAULT_HOST
}

/** Optional segment after origin (rare). */
function extraPathPrefix() {
  const p = String(import.meta.env.VITE_MEDIA_PATH_PREFIX || '').trim().replace(/^\/+|\/+$/g, '')
  return p ? `${p}/` : ''
}

/**
 * Strip wrapper URL and return storage-relative path like `products/logo.png`.
 * @param {unknown} pathOrUrl
 * @returns {string}
 */
export function extractProductImageStoragePath(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return ''
  const s = String(pathOrUrl).trim()
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, '')

  try {
    const u = new URL(s)
    const p = u.pathname

    const mediaNeedle = '/media/'
    const mi = p.indexOf(mediaNeedle)
    if (mi >= 0) {
      return decodeURIComponent(p.slice(mi + mediaNeedle.length).replace(/^\/+/, ''))
    }

    const legacyFiles = '/api/products/files/'
    const fi = p.indexOf(legacyFiles)
    if (fi >= 0) {
      return decodeURIComponent(p.slice(fi + legacyFiles.length).replace(/^\/+/, ''))
    }

    const m = p.match(/^\/api\/products\/(.+)$/i)
    if (m) {
      const rest = m[1]
      if (/^\d+$/.test(rest)) return ''
      if (rest.includes('/')) return decodeURIComponent(rest)
      return `products/${decodeURIComponent(rest)}`
    }

    return p.replace(/^\/+/, '')
  } catch {
    return ''
  }
}

/**
 * Path for `apiClient.get(..., { responseType: 'blob' })`.
 *
 * @param {unknown} pathOrUrl
 * @param {{ productId?: string | number }} [options]
 * @returns {string} e.g. `/media/products/logo.png`
 */
export function getProductImageApiPath(pathOrUrl, options = {}) {
  const storagePath = extractProductImageStoragePath(pathOrUrl)
  if (!storagePath) return ''

  const productId = options.productId
  const basename =
    storagePath.includes('/') ? storagePath.slice(storagePath.lastIndexOf('/') + 1) : storagePath

  const tpl =
    String(import.meta.env.VITE_PRODUCT_IMAGE_GET_PATH_TEMPLATE || '').trim() || '/media/{path}'

  let out = tpl
  if (productId != null && out.includes('{productId}')) {
    out = out.replace(/\{productId\}/g, String(productId))
  }
  out = out.replace(/\{path\}/g, storagePath)
  out = out.replace(/\{basename\}/g, encodeURIComponent(basename))

  if (!out.startsWith('/')) out = `/${out}`
  return out.replace(/([^:]\/)\/+/g, '/')
}

/**
 * Absolute URL (e.g. for opening in a new tab).
 * @param {unknown} pathOrUrl
 * @param {{ productId?: string | number }} [options]
 */
export function resolvePublicMediaUrl(pathOrUrl, options = {}) {
  if (pathOrUrl == null || pathOrUrl === '') return ''
  const s = String(pathOrUrl).trim()
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) {
    if (typeof window !== 'undefined' && window.location?.protocol) {
      return `${window.location.protocol}${s}`
    }
    return `https:${s}`
  }

  const apiPath = getProductImageApiPath(pathOrUrl, options)
  if (!apiPath) return ''

  const base = mediaBaseUrl()
  const extra = extraPathPrefix()
  return `${base}/${extra}${apiPath.replace(/^\//, '')}`.replace(/([^:]\/)\/+/g, '/')
}
