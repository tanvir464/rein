'use client';

import { ShieldCheck, Activity, Sparkles, HelpCircle } from 'lucide-react';
import type { RecipientRating } from '../lib/api';

const CONFIG: Record<RecipientRating, { label: string; bg: string; fg: string; tip: string; icon: typeof ShieldCheck }> = {
  known: {
    label: 'Known',
    bg: 'rgba(16,185,129,0.12)',
    fg: '#047857',
    tip: 'Matched a curated treasury or protocol label.',
    icon: ShieldCheck,
  },
  active: {
    label: 'Active',
    bg: 'rgba(59,130,246,0.12)',
    fg: '#1d4ed8',
    tip: 'Older than 30 days with >$1,000 in 30-day volume.',
    icon: Activity,
  },
  new: {
    label: 'New',
    bg: 'rgba(245,158,11,0.14)',
    fg: '#b45309',
    tip: 'First seen on-chain in the last 24 hours.',
    icon: Sparkles,
  },
  unknown: {
    label: 'Unknown',
    bg: 'rgba(100,116,139,0.14)',
    fg: '#475569',
    tip: 'No signal — no GoldRush match, no recent volume.',
    icon: HelpCircle,
  },
};

type Props = {
  rating: RecipientRating;
  size?: 'sm' | 'md';
  withTooltip?: boolean;
  className?: string;
};

export function ReputationBadge({ rating, size = 'md', withTooltip = true, className }: Props) {
  const c = CONFIG[rating];
  const Icon = c.icon;
  const padY = size === 'sm' ? 1 : 3;
  const padX = size === 'sm' ? 6 : 9;
  const fontSize = size === 'sm' ? 10 : 11;
  const iconSize = size === 'sm' ? 10 : 12;
  return (
    <span
      data-testid="reputation-badge"
      data-rating={rating}
      title={withTooltip ? c.tip : undefined}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: `${padY}px ${padX}px`,
        borderRadius: 999,
        fontSize,
        fontWeight: 600,
        letterSpacing: 0.2,
        background: c.bg,
        color: c.fg,
        textTransform: 'uppercase',
      }}
    >
      <Icon size={iconSize} />
      {c.label}
    </span>
  );
}
