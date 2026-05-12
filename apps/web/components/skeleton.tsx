import { cn } from '../lib/cn';

export function Skeleton({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-[var(--radius-md)]', className)} {...rest} />;
}
