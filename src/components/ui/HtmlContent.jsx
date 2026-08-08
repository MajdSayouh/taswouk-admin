// Renders sanitized HTML (product descriptions from WYSIWYG).
import DOMPurify from 'dompurify'
import { isHtmlEmpty } from '../../utils/htmlContent.js'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'span',
  'mark',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'hr',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'class']

/**
 * @param {{ html?: string | null, className?: string, empty?: import('react').ReactNode }} props
 */
export function HtmlContent({ html, className = '', empty = null }) {
  const trimmed = html?.trim()
  if (!trimmed || isHtmlEmpty(trimmed)) {
    return empty
  }

  const clean = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })

  return (
    <div
      className={`rich-html-content text-sm text-slate-800 ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
