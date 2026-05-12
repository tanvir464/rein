'use client';

import { useEffect, useState } from 'react';

const RECEIPTS = [
  { label: 'Anthropic · Claude', amount: '$1.20', runtime: 'mcp', time: '2s ago', dot: 'var(--success)' },
  { label: 'OpenAI · GPT-5', amount: '$0.80', runtime: 'openai', time: '38s ago', dot: 'var(--success)' },
  { label: 'x402 · pdfgen.dev', amount: '$0.05', runtime: 'mcp', time: '1m ago', dot: 'var(--success)' },
  { label: 'Brave Search', amount: '$0.02', runtime: 'sdk', time: '3m ago', dot: 'var(--success)' },
];

export function DashboardMock() {
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setPulse(true), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)',
        width: '100%',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          app.rein.so/app
        </div>
      </div>

      {/* Dashboard content */}
      <div style={{ padding: '16px 20px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>Main Agent Vault</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
              2QFW…wNj
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--success)', fontWeight: 600, background: 'var(--tone-success-bg)', borderRadius: 999, padding: '3px 8px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-ring 2s ease-in-out infinite' }} />
            active
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            { label: 'Balance', value: '$247.84', mono: true },
            { label: '24h spend', value: '$3.21', mono: true },
            { label: 'Daily cap', value: '$50.00', mono: true },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Activity label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live activity</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          {mounted && pulse && (
            <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, animation: 'fade-in 0.3s ease' }}>
              +1 new
            </span>
          )}
        </div>

        {/* Receipt rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {mounted && pulse && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 8,
                background: 'color-mix(in oklab, var(--accent-100) 60%, transparent)',
                border: '1px solid var(--accent-300)',
                animation: 'fade-in 0.35s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>Perplexity · search</span>
              <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', color: 'var(--accent-700)', fontWeight: 600 }}>$0.03</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>just now</span>
            </div>
          )}
          {RECEIPTS.map((r) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 8,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.dot, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12 }}>{r.label}</span>
              <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.amount}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', width: 48, textAlign: 'right' }}>{r.time}</span>
            </div>
          ))}
        </div>

        {/* Policy footer */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {[
            { k: 'daily', v: '$50' },
            { k: 'per-tx', v: '$5' },
            { k: 'step-up', v: '$10' },
            { k: 'version', v: 'v3' },
          ].map((p) => (
            <span
              key={p.k}
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '2px 6px',
                color: 'var(--muted)',
              }}
            >
              {p.k}=<span style={{ color: 'var(--fg)', fontWeight: 600 }}>{p.v}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
