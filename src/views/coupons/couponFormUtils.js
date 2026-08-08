/** @param {string | null | undefined} iso */
export function isoToLocalDatetimeValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** @param {string} localStr — `datetime-local` value */
export function localDatetimeToIso(localStr) {
  if (!localStr || !String(localStr).trim()) return null
  const d = new Date(localStr)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function emptyCouponForm() {
  return {
    code: '',
    name: '',
    discountPercent: '',
    maxUses: '',
    expiresAtLocal: '',
    isActive: true,
  }
}

/** @param {{ code?: string, name?: string, discountPercent?: number, maxUses?: number | null, expiresAt?: string | null, isActive?: boolean }} row */
export function couponRowToForm(row) {
  return {
    code: row.code ?? '',
    name: row.name ?? '',
    discountPercent: row.discountPercent != null ? String(row.discountPercent) : '',
    maxUses: row.maxUses != null ? String(row.maxUses) : '',
    expiresAtLocal: isoToLocalDatetimeValue(row.expiresAt),
    isActive: Boolean(row.isActive),
  }
}

/**
 * Build JSON body for POST or PATCH (same shape; PATCH treats absent keys as unchanged per backend).
 * @param {ReturnType<typeof emptyCouponForm>} form
 */
export function formToApiPayload(form) {
  const code = String(form.code ?? '').trim()
  const name = String(form.name ?? '').trim()
  const d = Number(form.discountPercent)
  const maxRaw = String(form.maxUses ?? '').trim()
  const maxParsed = maxRaw === '' ? null : Math.floor(Number(maxRaw))
  const max_uses = maxParsed != null && !Number.isNaN(maxParsed) ? maxParsed : null
  const expires_at = localDatetimeToIso(String(form.expiresAtLocal ?? ''))
  const is_active = Boolean(form.isActive)

  return {
    code,
    name,
    discount_percent: d,
    max_uses,
    expires_at,
    is_active,
  }
}

/**
 * @param {ReturnType<typeof emptyCouponForm>} form
 * @param {(key: string) => string} tErr — i18n for validation messages
 * @returns {string | null}
 */
export function validateCouponForm(form, tErr) {
  const code = String(form.code ?? '').trim()
  const name = String(form.name ?? '').trim()
  if (code.length < 2 || code.length > 50) return tErr('code')
  if (name.length < 2 || name.length > 150) return tErr('name')
  const d = Number(form.discountPercent)
  if (!Number.isFinite(d) || d <= 0 || d > 100) return tErr('discount')
  const maxRaw = String(form.maxUses ?? '').trim()
  if (maxRaw !== '') {
    const m = Math.floor(Number(maxRaw))
    if (!Number.isFinite(m) || m <= 0) return tErr('maxUses')
  }
  return null
}
