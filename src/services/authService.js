/**
 * Auth Service — HTTP only. Maps Taswouk `/api/accounts/*` endpoints.
 * @see https://v2.taswouk.com/api/docs
 */
import { apiClient } from './apiClient.js'

/**
 * @typedef {Object} LoginCredentials
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} password
 */

/**
 * @typedef {Object} UserProfile
 * @property {number} id
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [first_name]
 * @property {string} [last_name]
 * @property {string} [governorate]
 * @property {string} user_type
 * @property {boolean} is_active
 * @property {string} date_joined
 * @property {string} [store_name]
 * @property {string} [store_description]
 * @property {string} [vehicle_type]
 * @property {string} [license_number]
 * @property {boolean} [is_available]
 */

/**
 * POST /api/accounts/login — returns JWT in `token` when successful.
 * @param {LoginCredentials} credentials
 */
export async function loginRequest(credentials) {
  const { data } = await apiClient.post(
    '/api/accounts/login',
    credentials,
    { skipAuthLogout: true },
  )
  return data
}

/**
 * GET /api/accounts/profile — requires Bearer token (attached by apiClient).
 * @returns {Promise<UserProfile>}
 */
export async function getProfile() {
  const { data } = await apiClient.get('/api/accounts/profile')
  return data
}

/**
 * Client-side logout placeholder. Add POST `/api/accounts/logout` here if the API exposes it.
 */
export async function logoutRequest() {
  return Promise.resolve()
}

/**
 * POST /api/accounts/refresh-token — body: { refresh_token }.
 * Response: TokenResponse (access_token, refresh_token, expires_in).
 * @param {string} refreshToken
 */
export async function refreshTokenRequest(refreshToken) {
  const { data } = await apiClient.post(
    '/api/accounts/refresh-token',
    { refresh_token: refreshToken },
    {
      skipAuthHeader: true,
      skipAuthLogout: true,
      skipGlobalErrorMessage: true,
    },
  )
  return data
}
