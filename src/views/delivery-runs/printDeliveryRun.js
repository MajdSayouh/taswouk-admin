// A delivery run's sheet for the driver: printed from a window of its own, RTL, one row per order,
// with a blank column for the customer's signature.

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * @param {any} run — GET /api/delivery-runs/{id}
 * @param {(key: string, opts?: object) => string} t — the `pages` namespace
 */
export function printDeliveryRun(run, t) {
  const rows = (run.orders ?? [])
    .map(
      (o) => `<tr>
        <td>${escapeHtml(o.position)}</td>
        <td>#${escapeHtml(o.order_id)}</td>
        <td>${escapeHtml(o.store_name)}</td>
        <td>${escapeHtml(o.customer_name)}<br><small>${escapeHtml(o.customer_phone)}</small></td>
        <td>${escapeHtml(o.address_text)}${o.delivery_instruction ? `<br><small>${escapeHtml(o.delivery_instruction)}</small>` : ''}</td>
        <td>${escapeHtml(o.total_amount)}</td>
        <td>${o.outcome === 'pending' ? '' : escapeHtml(o.outcome_label)}</td>
        <td class="sign"></td>
      </tr>`,
    )
    .join('')
  const title = `${t('deliveryRuns.run', { id: run.id })} — ${run.day}`
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Tahoma, Arial, sans-serif; margin: 16px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p { margin: 0 0 12px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #999; padding: 6px; text-align: start; vertical-align: top; }
      th { background: #f1f5f9; }
      td.sign { min-width: 90px; }
      small { color: #555; }
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(t('deliveryRuns.driver'))}: ${escapeHtml(run.driver_name || t('deliveryRuns.noDriver'))}${run.note ? ` — ${escapeHtml(run.note)}` : ''}</p>
    <table><thead><tr>
      <th>#</th><th>${escapeHtml(t('deliveryRuns.col.order'))}</th><th>${escapeHtml(t('deliveryRuns.col.store'))}</th>
      <th>${escapeHtml(t('deliveryRuns.col.customer'))}</th><th>${escapeHtml(t('deliveryRuns.col.address'))}</th>
      <th>${escapeHtml(t('deliveryRuns.col.total'))}</th><th>${escapeHtml(t('deliveryRuns.col.outcome'))}</th>
      <th>${escapeHtml(t('deliveryRuns.col.signature'))}</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload = () => window.print()</script>
    </body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}
