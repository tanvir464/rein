'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-pill)] select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]';

// Colored variants use `filter: brightness(...)` for hover/active so they
// darken in both themes — the token ramp deliberately flips --accent-900
// lighter in dark mode (for text-on-surface contrast), which would *lighten*
// the primary button on hover if we referenced --accent-900 directly.
// Arbitrary-value syntax `brightness-[0.85]` ensures JIT compilation.
const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--accent-700)] text-white hover:brightness-[0.85] active:brightness-[0.7]',
  secondary:
    'bg-[var(--bg)] text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--bg-elevated)]',
  ghost: 'bg-transparent text-[var(--fg)] hover:bg-[var(--bg-elevated)]',
  danger: 'bg-[var(--danger)] text-white hover:brightness-[0.85] active:brightness-[0.7]',
};

const sizes: Record<Size, string> = {
  sm: 'text-[13px] h-8 px-3',
  md: 'text-sm h-10 px-5',
  lg: 'text-[15px] h-12 px-7',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={cn(base, variants[variant], sizes[size], className)}
      style={{
        transition:
          'background-color var(--dur-instant) var(--ease-snap), color var(--dur-instant) var(--ease-snap), border-color var(--dur-instant) var(--ease-snap), filter var(--dur-instant) var(--ease-snap)',
        ...(rest.style ?? {}),
      }}
      aria-busy={loading || undefined}
    >
      {loading && (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
});
