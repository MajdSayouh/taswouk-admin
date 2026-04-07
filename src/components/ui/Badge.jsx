// Reusable UI component (View layer): small status tag/badge used in tables and cards.
// Keeps status visuals consistent across Orders/Products/etc.

const variants = {
  brand: 'bg-[#FF7D29]/10 text-[#FF7D29] border-[#FF7D29]/25',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-5',
        variants[variant] ?? variants.neutral,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

