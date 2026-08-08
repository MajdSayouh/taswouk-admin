// Helpers for product description HTML (WYSIWYG storage).

/**
 * True when HTML has no meaningful text (e.g. empty, `<p><br></p>`, whitespace).
 * @param {string | null | undefined} html
 */
export function isHtmlEmpty(html) {
  if (html == null || typeof html !== 'string') return true
  const trimmed = html.trim()
  if (!trimmed) return true

  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(trimmed, 'text/html')
    const text = (doc.body.textContent ?? '').replace(/\u00a0/g, ' ').trim()
    return text.length === 0
  }

  return !trimmed.replace(/<[^>]*>/g, '').replace(/\s/g, '').length
}

/**
 * Plain text from HTML (search, previews).
 * @param {string | null | undefined} html
 */
export function stripHtml(html) {
  if (html == null || typeof html !== 'string') return ''
  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent ?? ''
  }
  return html.replace(/<[^>]*>/g, '')
}
