import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Props = HTMLAttributes<HTMLDivElement> & { interactive?: boolean };

export const Card = forwardRef<HTMLDivElement, Props>(function Card(
  { className, interactive, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      data-interactive={interactive ? '' : undefined}
      className={cn(
        'card rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)]',
        interactive && 'card-interactive',
        className,
      )}
    />
  );
});
