'use client';

import { ShieldCheck, Activity, Bell, Boxes, BarChart3, Key } from 'lucide-react';

/* ─── shared sub-components ─────────────────────────────────────────────── */

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        color: 'var(--accent-700)',
        marginBottom: 14,
      }}
    >
      {children}
    </span>
  );
}

function RealWorldNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: '12px 16px',
        borderRadius: 10,
        background: 'var(--accent-100)',
        border: '1px solid var(--accent-300)',
        fontSize: 13,
        color: 'var(--accent-900)',
        lineHeight: 1.6,
      }}
    >
      <span style={{ fontWeight: 700 }}>Real world: </span>
      {children}
    </div>
  );
}

/* ─── individual visuals ─────────────────────────────────────────────────── */

function PolicyMock() {
  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>Policy Editor</span>
      </div>
      <div style={{ padding: '20px 24px', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2 }}>
        <div style={{ color: 'var(--muted)' }}>{'{'}</div>
        {[
          ['"daily_cap_usdc":', ' 50.00,', false],
          ['"per_tx_cap_usdc":', ' 5.00,', false],
          ['"step_up_threshold":', ' 10.00,', true],
          ['"allowlist":', ' ["api.brave.com"],', false],
          ['"paused":', ' false', false],
        ].map(([k, v, highlight]) => (
          <div
            key={k as string}
            style={{
              display: 'flex',
              borderRadius: 6,
              padding: '0 6px',
              margin: '0 -6px',
              background: highlight ? 'var(--accent-100)' : 'transparent',
            }}
          >
            <span style={{ color: 'var(--accent-700)' }}>{k as string}</span>
            <span style={{ color: 'var(--muted)' }}>{v as string}</span>
          </div>
        ))}
        <div style={{ color: 'var(--muted)' }}>{'}'}</div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Version 3 · deployed on-chain</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', background: 'var(--tone-success-bg)', padding: '2px 8px', borderRadius: 999 }}>Active</span>
      </div>
    </div>
  );
}

function ActivityMock() {
  const txns = [
    { label: 'Perplexity · search', amt: '$0.03', ago: 'just now', hot: true },
    { label: 'Anthropic · Claude', amt: '$1.20', ago: '2s ago', hot: false },
    { label: 'OpenAI · GPT-5', amt: '$0.80', ago: '38s ago', hot: false },
    { label: 'x402 · pdfgen.dev', amt: '$0.05', ago: '1m ago', hot: false },
    { label: 'Brave Search', amt: '$0.02', ago: '3m ago', hot: false },
  ];
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
      <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Live activity</span>
        <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, background: 'var(--tone-success-bg)', padding: '2px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse-ring 2s infinite' }} />
          live
        </span>
      </div>
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {txns.map((t) => (
          <div
            key={t.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              background: t.hot ? 'color-mix(in oklab, var(--accent-100) 70%, transparent)' : 'transparent',
              border: t.hot ? '1px solid var(--accent-300)' : '1px solid transparent',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: t.hot ? 'var(--accent-700)' : 'var(--fg)' }}>{t.amt}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', width: 50, textAlign: 'right' }}>{t.ago}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 20px', fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Total today: <strong style={{ color: 'var(--fg)' }}>$3.21</strong></span>
        <span>Daily cap: <strong style={{ color: 'var(--fg)' }}>$50.00</strong></span>
      </div>
    </div>
  );
}

function StepUpMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Phone notification */}
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '16px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bell size={18} color="var(--accent-700)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Step-up required</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Your agent wants to pay <strong style={{ color: 'var(--fg)' }}>$47.00</strong> to flights.expedia.com — above your $10 threshold.
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, height: 32, borderRadius: 8, background: 'var(--accent-700)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Approve
            </button>
            <button style={{ flex: 1, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--fg)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Deny
            </button>
          </div>
        </div>
      </div>
      {/* Approved state */}
      <div style={{ background: 'var(--tone-success-bg)', border: '1px solid var(--success)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Approved — $47.00 to flights.expedia.com</span>
      </div>
    </div>
  );
}

function InsightsMock() {
  const recipients = [
    { name: 'Anthropic · Claude', pct: 78, amount: '$248.40' },
    { name: 'Brave Search', pct: 12, amount: '$38.20' },
    { name: 'Perplexity', pct: 7, amount: '$22.30' },
    { name: 'pdfgen.dev', pct: 3, amount: '$9.60' },
  ];
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
      <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Top recipients · last 30 days</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {recipients.map((r) => (
          <div key={r.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{r.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.amount}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${r.pct}%`, background: 'var(--accent-700)', borderRadius: 999, transition: 'width 1s ease' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', gap: 16 }}>
        {[{ label: 'Total spend', val: '$318.50' }, { label: 'Cost/task', val: '$0.18' }, { label: 'Saved vs raw', val: '34%' }].map(s => (
          <div key={s.label} style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: s.label === 'Saved vs raw' ? 'var(--success)' : 'var(--fg)' }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── feature data ───────────────────────────────────────────────────────── */

const FEATURES = [
  {
    tag: 'On-chain enforcement',
    Icon: ShieldCheck,
    title: 'Policies your agent cannot bypass.',
    body: 'Daily caps, per-tx limits, allowlists, and step-up thresholds live in an Anchor program on Solana. A compromised service, a jailbroken prompt, or a rogue dependency cannot override them — the policy is checked inside the transaction.',
    realWorld: 'A Claude Code agent books travel autonomously. Even if it\'s tricked into requesting $500 for "flights," your $5 per-tx cap stops it cold — on-chain, before any funds move.',
    visual: <PolicyMock />,
    flip: false,
  },
  {
    tag: 'Live activity feed',
    Icon: Activity,
    title: 'Every spend. Visible. Refundable.',
    body: 'Real-time WebSocket receipts appear the moment your agent pays. Every transaction is permanently logged on Solana — exportable as CSV or JSON, disputable in one click, and visible to any auditor without giving them wallet access.',
    realWorld: 'You\'re asleep. Your agent runs overnight processing 200 tasks. Morning review shows every dollar spent — on-chain receipts for each API call, grouped by recipient, flagged anomalies highlighted.',
    visual: <ActivityMock />,
    flip: true,
  },
  {
    tag: 'Step-up approvals',
    Icon: Bell,
    title: 'Big transactions pause for you.',
    body: 'Set a step-up threshold — any payment above it triggers a push notification to your phone. Your agent pauses, waits up to 5 minutes for approval, then executes or cancels. Biometric confirm, one tap.',
    realWorld: 'Your research agent finds a $47 dataset on a paid API. Before the money moves, your phone buzzes. You approve it in 3 seconds. The agent continues. You never lose control of large decisions.',
    visual: <StepUpMock />,
    flip: false,
  },
  {
    tag: 'Spend analytics',
    Icon: BarChart3,
    title: 'Know exactly what your agent costs.',
    body: 'Per-recipient breakdowns, cost-per-task calculations, week-over-week trends, and anomaly flags — all derived from your on-chain receipts. No third-party tracking. The data is yours, permanently.',
    realWorld: 'A startup running a LangChain research assistant discovers 78% of spend goes to Claude API calls. They optimize their prompts and cut monthly AI cost by 34% — with receipts to prove the savings.',
    visual: <InsightsMock />,
    flip: true,
  },
];

/* ─── main export ─────────────────────────────────────────────────────────── */

export function FeatureShowcase() {
  return (
    <section style={{ padding: '96px 0', background: 'var(--bg)' }}>
      <div className="mx-auto px-6" style={{ maxWidth: 'var(--container)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-700)', margin: '0 0 12px' }}>
            Built for production
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
            Every feature ships real-world value.
            <br />
            <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Not demos. Not concepts. Shipped.</span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 540, margin: '0 auto', lineHeight: 1.65 }}>
            Six months of agent commerce pain points — solved, tested, and running on Solana devnet today.
          </p>
        </div>

        {/* Alternating panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}>
          {FEATURES.map(({ tag, Icon, title, body, realWorld, visual, flip }) => (
            <div
              key={tag}
              className="feature-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 64,
                alignItems: 'center',
              }}
            >
              {/* Text */}
              <div style={{ order: flip ? 2 : 1 }}>
                <Tag>
                  <Icon size={13} />
                  {tag}
                </Tag>
                <h3
                  style={{
                    fontSize: 'clamp(22px, 3vw, 30px)',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                    margin: '0 0 16px',
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{body}</p>
                <RealWorldNote>{realWorld}</RealWorldNote>
              </div>

              {/* Visual */}
              <div style={{ order: flip ? 1 : 2 }}>{visual}</div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
