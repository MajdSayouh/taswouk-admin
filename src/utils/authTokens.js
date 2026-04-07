/**
 * Taswouk login/refresh responses may not match the public OpenAPI schema:
 * some stacks return SimpleJWT-style { access, refresh } while others use { token }.
 */

export function normalizeBearerToken(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (s.toLowerCase().startsWith('bearer ')) return s.slice(7).trim()
  return s
}

/** Prefer real JWT fields first so we never send a refresh token as the access token by mistake. */
export function pickAccessToken(payload) {
  if (!payload || typeof payload !== 'object') return null
  const candidates = [
    payload.access_token,
    payload.access,
    payload.token,
    payload.tokens?.access_token,
    payload.tokens?.access,
    payload.data?.access_token,
    payload.data?.access,
    payload.data?.token,
  ]
  for (const c of candidates) {
    const n = normalizeBearerToken(c)
    if (n) return n
  }
  return null
}

export function pickRefreshToken(payload) {
  if (!payload || typeof payload !== 'object') return null
  const candidates = [
    payload.refresh_token,
    payload.refresh,
    payload.tokens?.refresh,
    payload.tokens?.refresh_token,
    payload.data?.refresh_token,
    payload.data?.refresh,
  ]
  for (const c of candidates) {
    const n = normalizeBearerToken(c)
    if (n) return n
  }
  return null
}
