import Link from 'next/link';

interface ReinBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

const sizes = {
  sm: { height: 24, fontSize: 10, gap: 5, px: 8, markSize: 12 },
  md: { height: 32, fontSize: 12, gap: 6, px: 10, markSize: 16 },
  lg: { height: 40, fontSize: 14, gap: 8, px: 14, markSize: 20 },
};

export function ReinBadge({ size = 'md', href = 'https://app.rein.so' }: ReinBadgeProps) {
  const s = sizes[size];
  const content = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        height: s.height,
        padding: `0 ${s.px}px`,
        borderRadius: 9999,
        background: 'var(--accent-100, #e6f7f4)',
        border: '1px solid var(--accent-300, #7dd3c8)',
        color: 'var(--accent-900, #0d5c52)',
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-sans, system-ui)',
        letterSpacing: '-0.01em',
        textDecoration: 'none',
        cursor: href ? 'pointer' : 'default',
        transition: 'background 0.09s ease',
      }}
    >
      {/* REIN mark — simplified loop symbol */}
      <svg width={s.markSize} height={s.markSize} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M17 8l4-4M21 8V4h-4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      REIN inside
    </span>
  );

  if (href) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }
  return content;
}
