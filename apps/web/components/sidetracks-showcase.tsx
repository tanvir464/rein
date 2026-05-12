import Link from 'next/link';
import { ArrowRight, EyeOff, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

/* Three alternating feature panels showcasing the side-track integrations
   shipped 2026-05: Umbra-private spend, recipient reputation (GoldRush),
   treasury-grade USD insights (GoldRush). */

type Panel = {
  tag: string;
  title: string;
  body: React.ReactNode;
  ctaLabel: string;
  ctaHref: string;
  visual: 'screenshot' | 'reputation-mock';
  src?: string;
  alt?: string;
  reverse?: boolean;
};

const PANELS: Panel[] = [
  {
    tag: 'Shipped 2026-05 · REIN × Umbra · Arcium',
    title: 'Private spend, by design.',
    body: (
      <>
        Public agent spend is a non-starter for any business past dev-mode. REIN&apos;s policy enforcement
        stays on-chain and verifiable. Execution rides Umbra&apos;s shielded UTXO pool — Solscan sees only a
        commitment, the owner decrypts in-browser via view key, and auditors get scoped disclosure.
        Competitors get nothing.
      </>
    ),
    ctaLabel: 'Try the toggle on devnet',
    ctaHref: '/app',
    visual: 'screenshot',
    src: '/screenshots/sidetracks/landing-private-tab-observer.png',
    alt: 'REIN private receipts tab in observer mode — commitments visible, amounts and recipients hidden',
  },
  {
    tag: 'Shipped 2026-05 · REIN × GoldRush',
    title: "Know who you're paying. Before you approve.",
    body: (
      <>
        Paste a recipient pubkey. REIN renders a graded card: 30-day USD volume, top holdings, first-seen
        date, protocol match. Green for known protocols. Amber for new addresses. Built on GoldRush data
        across 100+ chains. Cached for 24h at the edge.
      </>
    ),
    ctaLabel: 'See the policy editor',
    ctaHref: '/app',
    visual: 'reputation-mock',
    reverse: true,
  },
  {
    tag: 'Shipped 2026-05 · REIN × GoldRush',
    title: 'A dashboard your CFO checks.',
    body: (
      <>
        Token counts don&apos;t get sign-off. Dollar totals, week-over-week trends, and real outlier
        detection do. Every receipt is enriched with USD price at-time-of-spend. Anomalies surface in the
        panel — outlier amounts (mean + 2σ) and new-recipient flags. Computed live, cached at the edge.
      </>
    ),
    ctaLabel: 'See live insights',
    ctaHref: '/app/insights',
    visual: 'screenshot',
    src: '/screenshots/sidetracks/landing-insights-usd.png',
    alt: 'REIN insights dashboard with USD totals, week-over-week sparkline, and anomaly panel',
  },
];

function ReputationMock() {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        borderRadius: 16,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)',
        overflow: 'hidden',
      }}
    >
      {/* mock policy editor row */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 6 }}>
          Allowlist · paste recipient
        </div>
        <code
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--fg)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          PhAntomTeamPubkeyAbcd…7K2x
        </code>
      </div>
      {/* graded card */}
      <div style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(46, 196, 153, 0.14)',
              border: '1px solid rgba(46, 196, 153, 0.4)',
              color: 'hsl(160, 60%, 28%)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <ShieldCheck size={12} />
            Known protocol
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Phantom team</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontVariantNumeric: 'tabular-nums' }}>
          {[
            { k: '30d USD volume', v: '$4.3M' },
            { k: 'First seen', v: 'Jun 2022' },
            { k: 'Top holding', v: 'USDC' },
          ].map(({ k, v }) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--accent-100)', border: '1px solid var(--accent-300)', fontSize: 12, color: 'var(--accent-900)', lineHeight: 1.5 }}>
          GoldRush coverage · 100+ chains · cached 24h
        </div>
      </div>
    </div>
  );
}

function PanelVisual({ panel }: { panel: Panel }) {
  if (panel.visual === 'reputation-mock') return <ReputationMock />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={panel.src}
      alt={panel.alt || ''}
      loading="lazy"
      style={{
        width: '100%',
        height: 'auto',
        borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.02)',
        display: 'block',
      }}
    />
  );
}

export function SidetracksShowcase() {
  return (
    <section style={{ padding: '96px 0', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div className="mx-auto px-6" style={{ maxWidth: 'var(--container)' }}>
        <div className="text-center" style={{ marginBottom: 72 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent-700)',
              margin: '0 0 12px',
            }}
          >
            Shipped 2026-05 · Privacy + treasury layer
          </p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0,
              maxWidth: 760,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Public policy. Private spend.<br />
            <span style={{ color: 'var(--accent-700)' }}>Treasury-grade insights.</span>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'var(--muted)',
              lineHeight: 1.7,
              margin: '16px auto 0',
              maxWidth: 580,
            }}
          >
            REIN is the only spending layer that stays verifiable on-chain while keeping the things that
            matter — counterparties, amounts, recipients — private. Plus dollar-denominated observability
            built for sign-off.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}>
          {PANELS.map((panel, i) => (
            <div
              key={panel.title}
              className="grid md:grid-cols-2 gap-12 items-center"
              style={{ direction: panel.reverse ? 'rtl' : 'ltr' }}
            >
              <div style={{ direction: 'ltr' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.09em',
                    color: 'var(--accent-700)',
                    marginBottom: 14,
                  }}
                >
                  {i === 0 ? <EyeOff size={12} /> : i === 1 ? <Sparkles size={12} /> : <TrendingUp size={12} />}
                  {panel.tag}
                </span>
                <h3
                  style={{
                    fontSize: 'clamp(24px, 3vw, 32px)',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15,
                    margin: '0 0 14px',
                  }}
                >
                  {panel.title}
                </h3>
                <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 22px' }}>
                  {panel.body}
                </p>
                <Link
                  href={panel.ctaHref}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--accent-700)',
                  }}
                >
                  {panel.ctaLabel} <ArrowRight size={14} />
                </Link>
              </div>
              <div style={{ direction: 'ltr' }}>
                <PanelVisual panel={panel} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
