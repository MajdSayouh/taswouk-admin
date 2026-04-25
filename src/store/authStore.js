/**
 * Global auth state (Zustand + persist).
 *
 * Flow:
 * - `login` stores JWT from `authService` then loads `user` from GET /api/accounts/auth/me.
 * - `apiClient` request interceptor reads `token` for Bearer auth.
 * - `fetchProfile` refreshes `user` (e.g. after navigation with a valid session).
 * - `logout` clears persisted session; optional API logout can be added in `authService`.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { normalizeBearerToken, pickAccessToken, pickRefreshToken } from '../utils/authTokens.js'

/**
 * @typedef {Object} UserProfile
 * @property {number} id
 * @property {string} role
 * @property {string | null} [email]
 * @property {string | null} [phone]
 * @property {string | null} [first_name]
 * @property {string | null} [last_name]
 * @property {string | null} [governorate]
 * @property {boolean} is_active
 * @property {boolean} is_verified
 * @property {string | null} [vehicle_type]
 * @property {string | null} [license_number]
 * @property {boolean} [is_available]
 */

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      /** Present when the API returns `refresh_token` (see TokenResponse on refresh). */
      refreshToken: null,
      /** From GET /api/accounts/auth/me; null until loaded or after logout. */
      user: /** @type {UserProfile | null} */ (null),

      /**
       * @param {{ identifier?: string, email?: string, phone?: string, password: string }} credentials
       */
      login: async (credentials) => {
        const { loginRequest, getProfile } = await import('../services/authService.js')
        const auth = await loginRequest(credentials)
        if (auth && typeof auth.success === 'boolean' && auth.success === false) {
          throw new Error(auth.message || 'Login failed')
        }
        const access = pickAccessToken(auth)
        if (!access) {
          throw new Error(
            auth.message ||
              'Login succeeded but no access token was found. Expected one of: access, access_token, token.',
          )
        }
        const nextRefresh = pickRefreshToken(auth)
        set({ token: access, refreshToken: nextRefresh, user: null })
        try {
          const profile = await getProfile()
          set({ user: profile })
        } catch {
          // Session is still valid; profile can be retried via fetchProfile
        }
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null })
      },

      /** Refresh profile from API; clears user on hard failure when unauthenticated. */
      fetchProfile: async () => {
        const { getProfile } = await import('../services/authService.js')
        try {
          const profile = await getProfile()
          set({ user: profile })
          return profile
        } catch {
          set({ user: null })
          return null
        }
      },

      /** @param {UserProfile | null} user */
      setUser: (user) => set({ user }),

      /** @param {string | null} token */
      setToken: (token) => set({ token: normalizeBearerToken(token) }),

      /** @param {string | null} refreshToken */
      setRefreshToken: (refreshToken) => set({ refreshToken: normalizeBearerToken(refreshToken) }),
    }),
    {
      name: 'jomran-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)

/** Normalize API role strings (e.g. Admin, SUPER_ADMIN). */
function normalizeRole(role) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/** Roles treated as dashboard admin (sidebar + seller tools). Extend if backend uses other slugs. */
const ADMIN_ROLE_SLUGS = new Set(['admin', 'super_admin', 'superadmin', 'administrator', 'staff'])

/** @param {string | undefined | null} role */
export function isAdminRole(role) {
  const r = normalizeRole(role)
  if (!r) return false
  if (ADMIN_ROLE_SLUGS.has(r)) return true
  // e.g. "store_admin", "system_admin"
  return r.endsWith('_admin')
}

/** @param {string | undefined | null} role */
export function isSellerRole(role) {
  return normalizeRole(role) === 'seller'
}
