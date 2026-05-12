'use client';

import { useEffect, useState } from 'react';
import { relativeTime } from '../lib/format';

export function RelativeTime({ value, className }: { value: string | number | Date; className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLabel(relativeTime(value));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [value]);

  return (
    <span className={className} suppressHydrationWarning>
      {label ?? ''}
    </span>
  );
}
