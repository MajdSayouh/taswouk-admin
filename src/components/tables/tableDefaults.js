/** Shared pagination + table props for dashboard list tables */

export const DEFAULT_PAGE_SIZE = 10

export const PAGE_SIZE_OPTIONS = ['10', '20', '50']

/** Ant Design Table common props (visual consistency across lists) */
export const DASHBOARD_TABLE_PROPS = Object.freeze({
  size: 'middle',
  scroll: { x: 'max-content' },
})

/**
 * @param {{
 *   page: number
 *   pageSize: number
 *   total: number
 *   onChange: (page: number, pageSize: number) => void
 *   showTotal: (total: number, range?: [number, number]) => import('react').ReactNode
 * }} opts
 */
export function buildDashboardPagination(opts) {
  const { page, pageSize, total, onChange, showTotal } = opts
  return {
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showTotal,
    onChange,
  }
}
