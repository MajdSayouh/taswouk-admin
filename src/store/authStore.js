/**
 * Global auth state (Zustand + persist).
 *
 * Flow:
 * - `login` calls `authService` (after token is saved, `getProfile` loads the user).
 * - `apiClient` request interceptor reads `token` from this store for Bearer auth.
 * - `logout` clears persisted session; optional API logout can be added in `authService`.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { normalizeBearerToken, pickAccessToken, pickRefreshToken } from '../utils/authTokens.js'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      /** Present when the API returns `refresh_token` (see TokenResponse on refresh). */
      refreshToken: null,
      user: null,

      /**
       * @param {{ email?: string, phone?: string, password: string }} credentials
       */
      login: async (credentials) => {
        const { loginRequest, getProfile } = await import('../services/authService.js')
        const auth = await loginRequest(credentials)
        if (auth.success === false) {
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
        set({ token: access, refreshToken: nextRefresh })
        try {
          const profile = await getProfile()
          set({ user: profile })
        } catch (err) {
          set({ token: null, refreshToken: null, user: null })
          throw err
        }
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null })
      },

      setUser: (user) => set({ user }),

      /** @param {string | null} token */
      setToken: (token) => set({ token: normalizeBearerToken(token) }),

      /** @param {string | null} refreshToken */
      setRefreshToken: (refreshToken) => set({ refreshToken: normalizeBearerToken(refreshToken) }),
    }),
    {
      name: 'taswouk-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)
