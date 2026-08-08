// Multiline text field — same visual language as `Input.jsx`.

export function Textarea({ label, description, error, className = '', rows = 4, ...props }) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-900 ${className}`}>
      {label && <span className="font-medium">{label}</span>}
      <textarea
        rows={rows}
        className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D29] focus-visible:ring-offset-2 focus-visible:ring-offset-white resize-y"
        {...props}
      />
      {description && !error && (
        <span className="text-xs text-slate-500">{description}</span>
      )}
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  )
}
