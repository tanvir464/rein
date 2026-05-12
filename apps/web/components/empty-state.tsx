import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

type Props = {
  icon?: LucideIcon;
  title: string;
  body?: string;
  cta?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, body, cta, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3 px-8 py-14 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]',
        className,
      )}
    >
      {Icon && (
        <div
          className="flex items-center justify-center"
          style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--gray-100)' }}
        >
          <Icon size={22} color="var(--gray-700)" />
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-[var(--fg)] m-0">{title}</h3>
      {body && <p className="text-sm text-[var(--muted)] max-w-md m-0">{body}</p>}
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
