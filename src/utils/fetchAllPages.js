/**
 * Walks every page of a paginated admin list endpoint and returns the combined rows.
 *
 * Several admin list endpoints on this backend cap a single response at a default page
 * size (seen on the users-by-role and mall-products lists) without the frontend having
 * been told the exact pagination query-param convention. This tries the common
 * conventions in order, adopts whichever one actually returns new rows past page 1, and
 * walks the rest of the pages with it. If none of them work (backend ignores pagination
 * params entirely), it safely returns just what page 1 gave rather than looping forever.
 */

const PAGE_SIZE = 100
const MAX_PAGES = 50 // safety cap (5,000 rows) in case pagination params are silently ignored

/** Candidate query-param conventions for page N (1-indexed), tried in order. */
const PAGE_PARAM_STRATEGIES = [
  (p) => ({ page: p, limit: PAGE_SIZE }),
  (p) => ({ page: p, page_size: PAGE_SIZE }),
  (p) => ({ offset: (p - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
]

function dedupeInto(rows, seenIds, batch, idOf) {
  let newCount = 0
  for (const item of batch) {
    const key = idOf(item)
    if (key != null) {
      if (seenIds.has(key)) continue
      seenIds.add(key)
    }
    rows.push(item)
    newCount += 1
  }
  return newCount
}

/**
 * @param {(params: Record<string, number> | undefined) => Promise<{ items: unknown[], total: number | null }>} fetchPage
 *   Called with `undefined` for the first (unparameterized) request, then with each
 *   pagination-strategy's params for subsequent pages.
 * @param {(item: unknown) => string | null} idOf — extracts a dedup key from a row, or null to skip dedup for it.
 */
export async function fetchAllPages(fetchPage, idOf) {
  const seenIds = new Set()
  const rows = []

  const page1 = await fetchPage(undefined)
  const page1Batch = page1.items ?? []
  let total = page1.total ?? null
  dedupeInto(rows, seenIds, page1Batch, idOf)

  if (page1Batch.length < PAGE_SIZE) return rows // fewer than a full page — that's everything
  if (total != null && rows.length >= total) return rows

  let workingStrategy = null
  for (const strategy of PAGE_PARAM_STRATEGIES) {
    const { items = [], total: t } = await fetchPage(strategy(2))
    const before = rows.length
    const newCount = dedupeInto(rows, seenIds, items, idOf)
    if (newCount > 0) {
      workingStrategy = strategy
      if (total == null) total = t ?? null
      if (items.length < PAGE_SIZE || (total != null && rows.length >= total)) return rows
      break
    }
    rows.length = before // strategy didn't help — undo and try the next one
  }

  if (!workingStrategy) return rows // no pagination convention worked; page 1 is all we can get

  for (let page = 3; page <= MAX_PAGES; page += 1) {
    const { items = [] } = await fetchPage(workingStrategy(page))
    const newCount = dedupeInto(rows, seenIds, items, idOf)
    if (items.length === 0 || newCount === 0) break
    if (total != null && rows.length >= total) break
    if (items.length < PAGE_SIZE) break
  }

  return rows
}
