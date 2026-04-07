/**
 * Central HTTP layer for the Taswouk admin dashboard.
 *
 * API flow (MVVM):
 * 1. View calls a hook (ViewModel) which invokes a Service function.
 * 2. Service uses `apiClient` — it never talks to React or Zustand directly.
 * 3. Request interceptor: reads the latest Bearer token from `authStore` and
 *    attaches `Authorization` so JWT-protected routes work automatically.
 *    Use `skipAuthHeader: true` for login/refresh (no access token yet).
 * 4. Response interceptor: on 401, if a `refreshToken` exists, tries
 *    `POST /api/accounts/refresh-token` once, updates tokens, retries the request.
 *    Otherwise normalizes failures into `ApiError`; 401 with an access token clears session.
 *
 * @see https://v2.taswouk.com/api/docs
 */
import axios from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../store/authStore.js'
import { normalizeBearerToken, pickAccessToken } from '../utils/authTokens.js'

const DEFAULT_BASE_URL = 'https://v2.taswouk.com'

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
  return (fromEnv && String(fromEnv).trim()) || DEFAULT_BASE_URL
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

export const apiClient = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

    const isAuthLogin = url.includes('/api/accounts/login')
    const isAuthRefresh = url.includes('/api/accounts/refresh-token')

    if (
      status === 401 &&
      !cfg.skipAuthLogout &&
      !cfg._retryRefresh &&
      !isAuthLogin &&
      !isAuthRefresh
    ) {
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        cfg._retryRefresh = true
        try {
          const { refreshTokenRequest } = await import('./authService.js')
          const data = await refreshTokenRequest(refreshToken)
          const access = pickAccessToken(data)
          if (!access) throw new Error('No access token in refresh response')
          useAuthStore.getState().setToken(access)
          if (data.refresh_token) {
            useAuthStore.getState().setRefreshToken(data.refresh_token)
          }
          cfg.headers = cfg.headers || {}
          const scheme = String(import.meta.env.VITE_AUTH_SCHEME || 'Bearer').trim() || 'Bearer'
          cfg.headers.Authorization = `${scheme} ${access}`
          return apiClient(cfg)
        } catch (refreshErr) {
          useAuthStore.getState().logout()
          message.warning('Your session expired. Please sign in again.')
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

    const hadToken = Boolean(useAuthStore.getState().token)
    if (status === 401 && hadToken && !cfg.skipAuthLogout) {
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
