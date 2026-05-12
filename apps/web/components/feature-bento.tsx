'use client';

import { DashboardMock } from './dashboard-mock';

/* ─── shared card shell ──────────────────────────────────────────────────── */
function BentoCard({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-elevated)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── card visuals ───────────────────────────────────────────────────────── */

function PolicyVisual() {
  const lines = [
    ['  "daily_cap_usdc":', ' 50.00,', 'val'],
    ['  "per_tx_cap_usdc":', ' 5.00,', 'val'],
    ['  "step_up_threshold":', ' 10.00,', 'val'],
    ['  "allowlist":', ' ["api.brave.com"],', 'val'],
    ['  "paused":', ' false,', 'val'],
    ['  "version":', ' 3', 'val'],
  ];
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
        lineHeight: 1.9,
        padding: '20px 24px 16px',
        background: 'var(--bg)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        margin: '0 20px',
        flex: 1,
      }}
    >
      <div style={{ color: 'var(--muted)' }}>{'{'}</div>
      {lines.map(([key, val], i) => (
        <div key={i}>
          <span style={{ color: 'var(--accent-700)' }}>{key}</span>
          <span style={{ color: 'var(--muted)' }}>{val}</span>
        </div>
      ))}
      <div style={{ color: 'var(--muted)' }}>{'}'}</div>
    </div>
  );
}

function InstallVisual() {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
        lineHeight: 2.0,
        padding: '20px 24px',
        background: 'var(--bg)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        margin: '0 20px',
      }}
    >
      <div>
        <span style={{ color: 'var(--muted)', userSelect: 'none' }}>$ </span>
        <span style={{ color: 'var(--accent-700)' }}>npx @rein/cli init</span>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>
        <div>✓ Detected Claude Code</div>
        <div>✓ Vault linked: <span style={{ color: 'var(--fg)' }}>2QFW…wNj</span></div>
        <div>✓ MCP config written to <span style={{ color: 'var(--fg)' }}>~/.claude/.mcp.json</span></div>
        <div style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--success)', fontWeight: 600 }}>Done</span>
          <span> in 4s. Restart Claude Code to activate.</span>
        </div>
      </div>
    </div>
  );
}

function RuntimesVisual() {
  const runtimes = [
    { name: 'Claude Code', pkg: '@rein/mcp' },
    { name: 'LangChain', pkg: '@rein/langchain' },
    { name: 'OpenAI', pkg: '@rein/openai' },
    { name: 'Vercel AI', pkg: '@rein/ai' },
    { name: 'Python', pkg: 'pip install rein' },
    { name: 'Cursor', pkg: '@rein/mcp' },
  ];
  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {runtimes.map((r) => (
        <div
          key={r.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            borderRadius: 10,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-700)',
              background: 'var(--accent-100)',
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            {r.pkg}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── card text block ────────────────────────────────────────────────────── */
function CardText({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div style={{ padding: '20px 24px 24px' }}>
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          color: 'var(--accent-700)',
        }}
      >
        {label}
      </p>
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>{body}</p>
    </div>
  );
}

/* ─── main export ─────────────────────────────────────────────────────────── */
export function FeatureBento() {
  return (
    <section
      style={{
        padding: '96px 0',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: '0 24px' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent-700)',
            }}
          >
            Everything you need
          </p>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            Policies on-chain. Drop-in everywhere.
            <br />
            <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Auditable by default.</span>
          </h2>
        </div>

        {/* Bento grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: 16,
          }}
          className="bento-grid"
        >
          {/* Card 1 — large left, Activity/Dashboard */}
          <BentoCard style={{ gridRow: '1 / 3' }}>
            <div style={{ padding: '24px 20px 16px', flex: 1, display: 'flex', alignItems: 'stretch' }}>
              <DashboardMock />
            </div>
            <CardText
              label="Live activity"
              title="Every spend. Visible. Refundable."
              body="Real-time receipts the moment your agent pays. Dispute any payment, block a recipient, or pause the vault — all in one click."
            />
          </BentoCard>

          {/* Card 2 — top right, Policy */}
          <BentoCard>
            <div style={{ padding: '24px 0 16px', flex: 1 }}>
              <PolicyVisual />
            </div>
            <CardText
              label="On-chain enforcement"
              title="Policies your agent can't bypass."
              body="Daily caps, per-tx limits, allowlists, step-up thresholds — enforced by an Anchor program. A compromised service can't override them."
            />
          </BentoCard>

          {/* Card 3 — bottom right split into two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Card 3a — Install */}
            <BentoCard>
              <div style={{ padding: '24px 0 16px', flex: 1 }}>
                <InstallVisual />
              </div>
              <CardText
                label="30-second setup"
                title="One command. Any runtime."
                body="The CLI detects your agent runtime and writes the config automatically."
              />
            </BentoCard>

            {/* Card 3b — Runtimes */}
            <BentoCard>
              <div style={{ padding: '24px 0 16px', flex: 1 }}>
                <RuntimesVisual />
              </div>
              <CardText
                label="6 runtimes"
                title="Same vault, everywhere."
                body="One vault powers MCP, LangChain, OpenAI Functions, Vercel AI, and Python."
              />
            </BentoCard>
          </div>
        </div>
      </div>

    </section>
  );
}
