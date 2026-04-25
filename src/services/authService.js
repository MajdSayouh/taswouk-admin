/**
 * Auth Service — HTTP only. Maps `/api/accounts/*` endpoints (Jomran API).
 * @see https://test.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/**
 * @typedef {Object} LoginCredentials
 * @property {string} [identifier] — email or phone (preferred by API)
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} password
 */

/**
 * POST /api/accounts/auth/login — body `{ identifier, password }` (identifier = email or phone).
 * @param {LoginCredentials} credentials
 */
export async function loginRequest(credentials) {
  const identifier =
    (credentials.identifier && String(credentials.identifier).trim()) ||
    (credentials.email && String(credentials.email).trim()) ||
    (credentials.phone && String(credentials.phone).trim()) ||
    ''
  const body = {
    identifier,
    password: credentials.password,
  }
  const { data } = await apiClient.post('/api/accounts/auth/login', body, {
    skipAuthLogout: true,
  })
  return data
}

/**
 * Client-side logout placeholder. Add POST `/api/accounts/logout` here if the API exposes it.
 */
export async function logoutRequest() {
  return Promise.resolve()
}

/**
 * POST /api/accounts/auth/refresh-token — body: { refresh_token }.
 * Response: TokenPairSchema (access_token, refresh_token, …).
 * @param {string} refreshToken
 */
export async function refreshTokenRequest(refreshToken) {
  const { data } = await apiClient.post(
    '/api/accounts/auth/refresh-token',
    { refresh_token: refreshToken },
    {
      skipAuthHeader: true,
      skipAuthLogout: true,
      skipGlobalErrorMessage: true,
    },
  )
  return data
}

/**
 * GET /api/accounts/auth/me — current user profile.
 * @returns {Promise<object>}
 */
export async function getProfile() {
  const { data } = await apiClient.get('/api/accounts/auth/me')
  return data
}
