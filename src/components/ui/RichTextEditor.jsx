// Full WYSIWYG field — stores HTML string (product description).
// Uses Quill (react-quill-new) instead of TipTap: TipTap's controlled-content sync kept
// re-normalizing pasted HTML and reverting the user's edits the moment they clicked back into
// the editor. Quill is used fully uncontrolled here — content is only ever loaded via
// `defaultValue` at mount, and reloaded by remounting on `resetKey` — so nothing ever fights
// the user's own typing or pasting.
import { useTranslation } from 'react-i18next'
import ReactQuill, { Quill } from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

// Align/background/color/direction default to class-based attributors (e.g. class="ql-align-center"),
// which only render correctly where quill.snow.css is loaded. Switch to inline-style attributors so
// the saved HTML looks right anywhere it's rendered (this dashboard's read view, the storefront, …).
const AlignStyle = Quill.import('attributors/style/align')
const BackgroundStyle = Quill.import('attributors/style/background')
const ColorStyle = Quill.import('attributors/style/color')
const DirectionStyle = Quill.import('attributors/style/direction')
Quill.register(AlignStyle, true)
Quill.register(BackgroundStyle, true)
Quill.register(ColorStyle, true)
Quill.register(DirectionStyle, true)

const TOOLBAR_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }, { direction: 'rtl' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block', 'link'],
    ['clean'],
  ],
  clipboard: {
    // Skip Quill's "visual" paste matchers (they insert extra empty paragraphs from some sources).
    matchVisual: false,
  },
}

const FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'align',
  'direction',
  'list',
  'blockquote',
  'code-block',
  'link',
]

/**
 * @param {{
 *   label?: string
 *   value?: string
 *   onChange: (html: string) => void
 *   className?: string
 *   placeholder?: string
 *   disabled?: boolean
 *   resetKey?: string | number
 * }} props
 */
export function RichTextEditor({
  label,
  value = '',
  onChange,
  className = '',
  placeholder,
  disabled = false,
  resetKey,
}) {
  const { t } = useTranslation('pages')

  const dir =
    typeof document !== 'undefined' ? document.documentElement.getAttribute('dir') || 'ltr' : 'ltr'

  return (
    // A plain <div>, not <label>: Quill's toolbar pickers (header, align, …) are each backed by a
    // hidden native <select>. A wrapping <label> auto-forwards any click inside it to the first
    // such <select> (implicit label/control association), firing a second, browser-generated click
    // on an element outside the picker's own container — which Quill's "click outside closes the
    // dropdown" listener reads as a click away from the picker, closing it the instant it opens.
    <div className={`flex flex-col gap-1 text-sm text-slate-900 ${className}`}>
      {label && <span className="font-medium">{label}</span>}
      <div
        className="rich-text-editor rounded-md border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#FF7D29] focus-within:ring-offset-2 focus-within:ring-offset-white"
        dir={dir}
      >
        <ReactQuill
          key={resetKey ?? 'static'}
          theme="snow"
          defaultValue={value || ''}
          onChange={onChange}
          readOnly={disabled}
          placeholder={placeholder || t('shared.placeholder')}
          modules={TOOLBAR_MODULES}
          formats={FORMATS}
        />
      </div>
    </div>
  )
}
