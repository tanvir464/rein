import { cn } from '../lib/cn';

type Tone = 'success' | 'warning' | 'danger' | 'muted' | 'accent';

const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: 'var(--tone-success-bg)', fg: 'var(--tone-success-fg)' },
  warning: { bg: 'var(--tone-warning-bg)', fg: 'var(--tone-warning-fg)' },
  danger: { bg: 'var(--tone-danger-bg)', fg: 'var(--tone-danger-fg)' },
  accent: { bg: 'var(--accent-soft-bg)', fg: 'var(--accent-soft-fg)' },
  muted: { bg: 'var(--tone-muted-bg)', fg: 'var(--tone-muted-fg)' },
};

export function StatusBadge({
  tone = 'muted',
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] font-medium rounded-[var(--radius-pill)]',
        className,
      )}
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.fg }} />}
      {children}
    </span>
  );
}
