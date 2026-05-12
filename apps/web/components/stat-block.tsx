import { cn } from '../lib/cn';

type Props = {
  label: string;
  value: React.ReactNode;
  delta?: { value: number; label?: string };
  prefix?: string;
  suffix?: string;
  className?: string;
};

export function StatBlock({ label, value, delta, prefix, suffix, className }: Props) {
  const positive = delta && delta.value >= 0;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span
        className="text-[12px] font-medium uppercase text-[var(--muted)]"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </span>
      <span
        className="tabular text-[var(--fg)]"
        style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em' }}
      >
        {prefix && <span className="text-[var(--muted)] mr-1 text-[24px]">{prefix}</span>}
        {value}
        {suffix && <span className="text-[var(--muted)] ml-1 text-[20px]">{suffix}</span>}
      </span>
      {delta && (
        <span
          className="tabular text-[12px] font-medium"
          style={{ color: positive ? 'var(--success)' : 'var(--danger)' }}
        >
          {positive ? '↑' : '↓'} {Math.abs(delta.value).toFixed(1)}%
          {delta.label && <span className="text-[var(--muted)] ml-1">{delta.label}</span>}
        </span>
      )}
    </div>
  );
}
