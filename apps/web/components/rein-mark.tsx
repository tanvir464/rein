type Props = { size?: number; className?: string; color?: string };

export function ReinMark({ size = 28, className, color = 'var(--accent-700)' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M16 4 C20 6, 21 10, 14 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12 C3 14, 4 18, 8 20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4 L8 4" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 20 L8 20" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 4 C4 6, 3 10, 12 12 C21 14, 20 18, 16 20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReinWordmark({ size = 18, className, color }: { size?: number; className?: string; color?: string }) {
  return (
    <span
      className={className}
      style={{ fontSize: size, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, color: color ?? 'var(--fg)' }}
    >
      REIN
    </span>
  );
}
