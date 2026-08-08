// Reusable UI component (View layer): card container for dashboard widgets and sections.
// Views should compose Cards to keep layout consistent across the admin panel.

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-xl shadow-sm shadow-slate-200/60 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
    </section>
  )
}

