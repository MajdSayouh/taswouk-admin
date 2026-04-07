// Reusable UI component (View layer): text input used across forms in the admin.
// It focuses purely on presentation and delegates behavior to ViewModels/forms.

export function Input({ label, description, error, className = '', ...props }) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-900 ${className}`}>
      {label && <span className="font-medium">{label}</span>}
      <input
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D29] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        {...props}
      />
      {description && !error && (
        <span className="text-xs text-slate-500">{description}</span>
      )}
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  )
}

