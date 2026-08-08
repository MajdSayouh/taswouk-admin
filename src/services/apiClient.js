/**
 * Central HTTP layer for the Jomran admin dashboard.
 *
 * API flow (MVVM):
 * 1. View calls a hook (ViewModel) which invokes a Service function.
 * 2. Service uses `apiClient` — it never talks to React or Zustand directly.
 * 3. Request interceptor: reads the latest Bearer token from `authStore` and
 *    attaches `Authorization` so JWT-protected routes work automatically.
 *    Use `skipAuthHeader: true` for login/refresh (no access token yet).
 * 4. Response interceptor: on 401, if a `refreshToken` exists, tries
 *    `POST /api/accounts/auth/refresh-token` once, updates tokens, retries the request.
 *    Otherwise normalizes failures into `ApiError`; 401 with an access token clears session.
 *
 * @see https://test.taswouk.com/api/docs
 */
import axios from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../store/authStore.js'
import { normalizeBearerToken, pickAccessToken, pickRefreshToken } from '../utils/authTokens.js'
import {
  getProductWriteRequestPath,
  isProductWriteRequest,
  logStrippedProductWriteFields,
  parseRequestDataAsObject,
  sanitizeProductWritePayload,
} from '../utils/productWritePayload.js'

const DEFAULT_BASE_URL = 'https://test.taswouk.com'

export class ApiError extends Error {
  constructor(messageText, { status, code, data } = {}) {
    super(messageText)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

function resolveBaseURL() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  const trimmed = fromEnv && String(fromEnv).trim()
  // Dev: same-origin `/api/*` so Vite can proxy and avoid browser CORS to the real API host.
  const useDevProxy =
    import.meta.env.DEV &&
    String(import.meta.env.VITE_USE_DEV_PROXY ?? 'true').toLowerCase() !== 'false'
  if (useDevProxy) {
    return ''
  }
  return trimmed || DEFAULT_BASE_URL
}

/** Aborted/cancelled requests (e.g. React Query on route change) have no `response` — not offline. */
function isAbortedOrCancelledRequest(error) {
  if (!error) return false
  if (error.code === 'ERR_CANCELED') return true
  if (error.name === 'CanceledError' || error.name === 'AbortError') return true
  if (typeof axios.isCancel === 'function' && axios.isCancel(error)) return true
  const signal = error.config?.signal
  if (signal?.aborted) return true
  const msg = String(error.message || '').toLowerCase()
  return msg === 'canceled' || msg === 'cancelled' || msg.includes('aborted')
}

function extractErrorMessage(payload) {
  if (payload == null) return 'Request failed'
  if (typeof payload === 'string') {
    if (payload.trimStart().startsWith('<!')) return 'Not found or invalid endpoint'
    return payload.length > 240 ? `${payload.slice(0, 240)}…` : payload
  }
  if (typeof payload.detail === 'string') return payload.detail
  if (Array.isArray(payload.detail)) {
    return payload.detail.map((d) => (typeof d === 'string' ? d : d?.msg ?? JSON.stringify(d))).join('; ')
  }
  if (payload.message) return String(payload.message)
  return 'Request failed'
}

// Do not set a global `Content-Type: application/json`. Axios adds it only when the body is a
// plain object (POST/PATCH/PUT). Forcing JSON on every method breaks DELETE (no body) and can
// yield 400 from strict APIs when `Content-Type: application/json` is sent with an empty body.
export const apiClient = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 30_000,
})

/**
 * One refresh request shared by every concurrent 401 response. Refresh tokens may rotate, so
 * sending the same token several times can make later refreshes fail and incorrectly log out.
 * @type {Promise<string> | null}
 */
let refreshSessionPromise = null

async function refreshAccessToken() {
  if (refreshSessionPromise) return refreshSessionPromise

  const refreshToken = normalizeBearerToken(useAuthStore.getState().refreshToken)
  if (!refreshToken) throw new Error('No refresh token available')

  refreshSessionPromise = (async () => {
    try {
      const { refreshTokenRequest } = await import('./authService.js')
      const data = await refreshTokenRequest(refreshToken)
      const access = pickAccessToken(data)
      if (!access) throw new Error('No access token in refresh response')

      // Do not restore a session after the user manually logged out while refresh was pending.
      const currentRefresh = normalizeBearerToken(useAuthStore.getState().refreshToken)
      if (currentRefresh !== refreshToken) {
        throw new Error('Session changed while token refresh was pending')
      }

      useAuthStore.getState().setToken(access)
      const rotatedRefresh = pickRefreshToken(data)
      if (rotatedRefresh) useAuthStore.getState().setRefreshToken(rotatedRefresh)
      return access
    } catch (error) {
      // Only expire the same session that initiated this refresh. This also prevents duplicate
      // warnings when several failed API requests are waiting for the shared promise.
      const currentRefresh = normalizeBearerToken(useAuthStore.getState().refreshToken)
      if (currentRefresh === refreshToken) {
        useAuthStore.getState().logout()
        message.warning('Your session expired. Please sign in again.')
      }
      throw error
    } finally {
      refreshSessionPromise = null
    }
  })()

  return refreshSessionPromise
}

apiClient.interceptors.request.use(
  (config) => {
    if (!config.skipAuthHeader) {
      const raw = useAuthStore.getState().token
      const token = normalizeBearerToken(raw)
      if (token) {
        const scheme = String(import.meta.env.VITE_AUTH_SCHEME || 'Bearer').trim() || 'Bearer'
        config.headers.Authorization = `${scheme} ${token}`
      }
    }

    const method = String(config.method || 'get')
    const path = getProductWriteRequestPath(config)
    const parsed = parseRequestDataAsObject(config.data)
    if (isProductWriteRequest(path, method) && parsed != null) {
      logStrippedProductWriteFields(parsed)
      config.data = sanitizeProductWritePayload(parsed)
    }

    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const payload = error.response?.data
    const cfg = error.config || {}
    const url = String(cfg.url || '')

    const isAuthLogin =
      url.includes('/api/accounts/auth/login') || url.includes('/api/accounts/login')
    const isAuthRefresh =
      url.includes('/api/accounts/auth/refresh-token') ||
      url.includes('/api/accounts/refresh-token')

    // Note: do not gate refresh on skipAuthLogout — silent routes (e.g. image blobs) still need token refresh.
    if (status === 401 && !cfg._retryRefresh && !isAuthLogin && !isAuthRefresh) {
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        cfg._retryRefresh = true
        try {
          const access = await refreshAccessToken()
          cfg.headers = cfg.headers || {}
          const scheme = String(import.meta.env.VITE_AUTH_SCHEME || 'Bearer').trim() || 'Bearer'
          cfg.headers.Authorization = `${scheme} ${access}`
          return apiClient(cfg)
        } catch (refreshErr) {
          const rp = refreshErr?.response?.data ?? refreshErr?.data
          const rs = refreshErr?.response?.status ?? refreshErr?.status
          return Promise.reject(
            new ApiError(extractErrorMessage(rp ?? payload), {
              status: rs ?? status,
              data: rp ?? payload,
            }),
          )
        }
      }
    }

    if (isAbortedOrCancelledRequest(error)) {
      return Promise.reject(error)
    }

    const hadToken = Boolean(useAuthStore.getState().token)
    // Do not force a full logout for a 401 that happens *after* a successful token refresh
    // (cfg._retryRefresh): the refresh proved the session is still valid, so a retried request
    // failing again is almost always endpoint-specific (e.g. a role/permission check the backend
    // reports as 401 instead of 403), not an expired session. Logging out here was wiping active
    // sessions mid-use whenever any single endpoint returned such a 401 shortly after a routine
    // token refresh. A genuinely dead session is still caught: refreshAccessToken() itself logs
    // out when the refresh call fails, and a request with no refresh token at all falls through
    // to this branch on its first (non-retried) 401.
    if (status === 401 && hadToken && !cfg.skipAuthLogout && !cfg._retryRefresh) {
      useAuthStore.getState().logout()
      message.warning('Your session expired. Please sign in again.')
    } else if (!cfg.skipGlobalErrorMessage && !error.response) {
      message.error('Network error. Check your connection and try again.')
    } else if (!cfg.skipGlobalErrorMessage && status >= 500) {
      message.error('Server error. Please try again later.')
    }

    const apiError = new ApiError(extractErrorMessage(payload), {
      status,
      data: payload,
    })
    return Promise.reject(apiError)
  },
)
