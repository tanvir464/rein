'use client';

import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, duration: number, started: boolean, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const factor = Math.pow(10, decimals);
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(Math.round(easeOutCubic(progress) * target * factor) / factor);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration, decimals]);
  return value;
}

interface AnimatedStatProps {
  prefix?: string;
  value: number;
  suffix?: string;
  label: string;
  duration?: number;
  sublabel?: string;
  decimals?: number;
}

function AnimatedStat({ prefix = '', value, suffix = '', label, duration = 1600, sublabel, decimals = 0 }: AnimatedStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const count = useCountUp(value, duration, started, decimals);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span
        className="tabular"
        style={{
          fontSize: 'clamp(36px, 5vw, 52px)',
          fontWeight: 700,
          color: 'var(--accent-700)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {prefix}{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
      </span>
      <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.7, textAlign: 'center', marginTop: 2, maxWidth: 220 }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

export function StatsStrip() {
  return (
    <section
      style={{
        padding: '72px 0',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      <div
        className="mx-auto px-6 grid grid-cols-2 md:grid-cols-4"
        style={{
          maxWidth: 'var(--container)',
          gap: 32,
        }}
      >
        <AnimatedStat prefix="$" value={10} suffix="M+" label="x402 volume on Solana" duration={1400} />
        <AnimatedStat value={35} suffix="M+" label="agent transactions secured" duration={1600} />
        <AnimatedStat prefix="<" value={2} suffix="s" label="policy round-trip latency" duration={900} />
        <AnimatedStat prefix="$" value={1.2} suffix="T+" label="recipient history graded" sublabel="Every allowlist entry, graded before approval" duration={1800} decimals={1} />
      </div>
    </section>
  );
}
