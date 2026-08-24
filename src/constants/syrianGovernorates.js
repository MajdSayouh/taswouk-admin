// Canonical list of Syrian governorates, in Arabic — this is the exact string set the backend
// matches a store's `address` against a customer's `governorate` for local-first store ordering
// (see docs/local-first-store-ordering-ar.md). Keeping store address selection to this fixed list
// (instead of free text) prevents spelling drift ("ريف دمشق" vs "ريف_دمشق") that would silently
// break the match — the backend list is unordered and does exact/`iexact` comparison, no fuzzy
// matching or migration in place.
export const SYRIAN_GOVERNORATES = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'درعا',
  'السويداء',
  'القنيطرة',
  'دير الزور',
  'الرقة',
  'الحسكة',
]

export const SYRIAN_GOVERNORATE_OPTIONS = SYRIAN_GOVERNORATES.map((name) => ({
  value: name,
  label: name,
}))
