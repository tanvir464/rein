'use client';

import type { ReactNode } from 'react';

export function HoverCard({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        ...style,
        transition: 'transform var(--dur-base) var(--ease-spring)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      {children}
    </div>
  );
}
