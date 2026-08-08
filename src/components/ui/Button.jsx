// Reusable UI component (View layer): generic button styled with Tailwind.
// It should be used by Views; it does not contain domain-specific logic.

const baseClasses =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D29] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none'

const variants = {
  primary:
    'bg-[#FF7D29] text-white hover:brightness-95 border border-[#FF7D29]',
  secondary:
    'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent',
}

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}) {
  const isLoading = Boolean(loading)
  const Elem = Tag

  return (
    <Elem
      className={`${baseClasses} ${variants[variant] ?? variants.primary} px-3 py-2 ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <span
          className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </Elem>
  )
}

