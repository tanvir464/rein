import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock } from 'lucide-react';
import { LandingNav } from '../../components/landing-nav';
import { ReinMark } from '../../components/rein-mark';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roadmap — REIN',
  description: 'Where REIN is going: key broker, mainnet, enterprise, and beyond.',
};

type Status = 'shipped' | 'building' | 'planned';

type Milestone = {
  label: string;
  status: Status;
  note?: string;
};

type Quarter = {
  period: string;
  theme: string;
  milestones: Milestone[];
};

const ROADMAP: Quarter[] = [
  {
    period: 'Q2 2026 — Now',
    theme: 'Foundation shipped',
    milestones: [
      { label: 'Anchor policy engine — 7 on-chain instructions', status: 'shipped' },
      { label: 'Daily cap, per-tx cap, allowlist, step-up threshold, expiry — enforced by program, not SaaS DB', status: 'shipped' },
      { label: 'x402 native USDC payments on Solana devnet', status: 'shipped' },
      { label: 'SpendReceipt PDA — every tx bounded, auditable, refundable', status: 'shipped' },
      { label: 'Step-up approval flow (owner one-click approve/deny)', status: 'shipped' },
      { label: 'Pause / dispute / expire + blocklist', status: 'shipped' },
      { label: 'Drop-in MCP server — spend, balance, history, request_step_up', status: 'shipped' },
      { label: 'Works in Claude Code, Cursor, Claude Desktop out of the box', status: 'shipped' },
      { label: 'LangChain tool wrappers', status: 'shipped' },
      { label: 'OpenAI Functions JSON schema export', status: 'shipped' },
      { label: 'Vercel AI SDK helpers', status: 'shipped' },
      { label: 'Python SDK (CrewAI / LangGraph / AutoGen)', status: 'shipped' },
      { label: '`rein init` CLI — installs MCP config in any runtime', status: 'shipped' },
      { label: 'Owner dashboard — policy editor, activity feed, step-up UI, insights, settings', status: 'shipped' },
      { label: 'Real-time receipts via WebSocket + Helius webhook', status: 'shipped' },
      { label: 'Cloudflare Workers service + Durable Objects activity stream', status: 'shipped' },
      { label: 'Confidential receipts via Umbra (Arcium-powered shielded UTXO spend)', status: 'shipped', note: 'Shipped 2026-05 — owner-private agent spend, on-chain policy stays public' },
      { label: 'Anomaly detection (heuristic) via GoldRush', status: 'shipped', note: 'Shipped 2026-05 — outlier amounts (mean + 2σ) + new-recipient flags + USD-denominated insights' },
      { label: 'Recipient reputation in policy editor (GoldRush)', status: 'shipped', note: 'Shipped 2026-05 — graded card on paste, 24h cached at the edge' },
    ],
  },
  {
    period: 'Q3 2026',
    theme: 'Mainnet + key broker',
    milestones: [
      { label: 'External security audit — program, key-broker design', status: 'building', note: 'Audit funded via Solana Foundation RFP or accelerator grant' },
      { label: 'Mainnet launch — Squads multisig as upgrade authority', status: 'building' },
      { label: 'Immunefi bug bounty ($10k pool on launch)', status: 'building' },
      { label: 'Key broker — 2-of-3 Shamir share split (wallet + KV + device)', status: 'planned' },
      { label: 'Encrypted API key vault on Cloudflare KV', status: 'planned' },
      { label: '`rein.proxy(service, request)` — agent never sees the key', status: 'planned', note: 'Bridges crypto and traditional APIs: OpenAI, AWS, Anthropic, GitHub Pro' },
      { label: 'Per-service cost estimator (token-based for LLMs)', status: 'planned' },
      { label: 'Batched on-chain settlement of proxied spend', status: 'planned' },
      { label: 'Squads multisig ↔ REIN policy composition (DAO treasury agents)', status: 'planned' },
      { label: 'Anonymous-mode UTXO (Umbra stealth addresses)', status: 'planned', note: 'Extends Q2 confidential receipts to fully anonymous recipient addresses' },
      { label: 'Compliance grants UI (Umbra view-key disclosure flow)', status: 'planned', note: 'Scoped auditor disclosure of confidential receipts without exposing the owner key' },
    ],
  },
  {
    period: 'Q4 2026',
    theme: 'Enterprise + ecosystem',
    milestones: [
      { label: 'Enterprise tier — SSO, SLA, audit export, custom domains', status: 'planned' },
      { label: 'Subscription billing / recurring x402 (v2)', status: 'planned' },
      { label: 'Mobile app — iOS + Android for step-up push approvals', status: 'planned' },
      { label: 'Agent marketplace — share and sell policy templates', status: 'planned' },
      { label: '"REIN inside" partner badge program — embed in CrewAI, LangGraph, AutoGen', status: 'planned' },
      { label: 'Docs site with full API reference and runtime recipes', status: 'planned' },
      { label: 'Granular telemetry — cost-per-task, model-by-model breakdown', status: 'planned' },
    ],
  },
  {
    period: '2027',
    theme: 'Multi-chain + privacy',
    milestones: [
      { label: 'Multi-chain support — EVM (Base, Arbitrum) + Cosmos via IBC', status: 'planned' },
      { label: 'KYA (Know Your Agent) — on-chain agent identity attestations', status: 'planned', note: 'Composable with existing KYC providers' },
      { label: 'Multi-currency insights (EUR/GBP via Covalent)', status: 'planned' },
      { label: 'Agent-to-agent spending — agents fund sub-agents from the same vault', status: 'planned' },
      { label: 'Visa + Stripe bridge — x402 policies enforced on fiat rails', status: 'planned', note: 'Visa Trusted Agent Protocol + Stripe Agent Commerce Protocol' },
    ],
  },
];

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; label: string }> = {
  shipped: { icon: CheckCircle2, color: 'var(--accent-700)', label: 'Shipped' },
  building: { icon: Clock, color: 'var(--warning)', label: 'Building' },
  planned: { icon: Circle, color: 'var(--muted)', label: 'Planned' },
};

function StatusDot({ status }: { status: Status }) {
  const { color } = statusConfig[status];
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        backgroundColor: status === 'planned' ? 'transparent' : color,
        border: `1.5px solid ${color}`,
        flexShrink: 0,
        marginTop: 6,
      }}
    />
  );
}

export default function RoadmapPage() {
  const shippedCount = (ROADMAP[0]?.milestones ?? []).filter((m) => m.status === 'shipped').length;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <LandingNav />

      <main className="flex-1 mx-auto w-full px-6 py-16" style={{ maxWidth: 'var(--container)' }}>
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] mb-10"
          style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        {/* Hero */}
        <div className="mb-16">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-pill)] border text-[12px] font-medium mb-5"
            style={{ borderColor: 'var(--accent-300)', backgroundColor: 'var(--accent-100)', color: 'var(--accent-900)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-700)' }} />
            {shippedCount} milestones shipped · devnet live
          </span>
          <h1
            className="m-0 mb-4"
            style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.05 }}
          >
            Building the spending layer
            <br />
            <span style={{ color: 'var(--accent-700)' }}>for every AI agent.</span>
          </h1>
          <p className="m-0 text-[17px] max-w-[540px]" style={{ color: 'var(--muted)' }}>
            REIN started as the missing guardrail for x402 payments. It ends as the canonical policy engine
            for agent commerce — across every chain, every runtime, every API.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 mb-12 text-sm" style={{ color: 'var(--muted)' }}>
          {(Object.entries(statusConfig) as [Status, (typeof statusConfig)[Status]][]).map(([key, { color, label }]) => (
            <span key={key} className="flex items-center gap-2">
              <StatusDot status={key} />
              {label}
            </span>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-0">
          {ROADMAP.map((quarter, qi) => (
            <div key={quarter.period} className="flex gap-8 relative">
              {/* Left rail */}
              <div className="flex flex-col items-center" style={{ width: 24, flexShrink: 0, paddingTop: 4 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: qi === 0 ? 'var(--accent-700)' : qi === 1 ? 'var(--warning)' : 'var(--border)',
                    border: '2px solid var(--bg)',
                    boxShadow: `0 0 0 2px ${qi === 0 ? 'var(--accent-700)' : qi === 1 ? 'var(--warning)' : 'var(--border)'}`,
                    flexShrink: 0,
                  }}
                />
                {qi < ROADMAP.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      minHeight: 24,
                      backgroundColor: 'var(--border)',
                      margin: '4px 0',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-14">
                <div className="flex flex-wrap items-baseline gap-3 mb-1">
                  <span
                    className="text-[13px] font-semibold uppercase tracking-wider"
                    style={{ color: qi === 0 ? 'var(--accent-700)' : qi === 1 ? 'var(--warning)' : 'var(--muted)' }}
                  >
                    {quarter.period}
                  </span>
                </div>
                <h2
                  className="m-0 mb-5"
                  style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg)' }}
                >
                  {quarter.theme}
                </h2>

                <div
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  {quarter.milestones.map((m, mi) => (
                    <div
                      key={mi}
                      className="flex gap-3 px-5 py-3.5"
                      style={{
                        borderBottom: mi < quarter.milestones.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <StatusDot status={m.status} />
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="text-[14px]"
                          style={{
                            color: m.status === 'shipped' ? 'var(--fg)' : m.status === 'building' ? 'var(--fg)' : 'var(--muted)',
                            fontWeight: m.status === 'shipped' ? 500 : 400,
                          }}
                        >
                          {m.label}
                        </span>
                        {m.note && (
                          <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
                            {m.note}
                          </span>
                        )}
                      </div>
                      {m.status === 'shipped' && (
                        <span
                          className="ml-auto flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] self-start mt-0.5 whitespace-nowrap"
                          style={{ backgroundColor: 'var(--accent-100)', color: 'var(--accent-900)' }}
                          title={m.note}
                        >
                          shipped 2026-05
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="rounded-[var(--radius-lg)] border border-[var(--border)] p-10 text-center mt-4"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <h3
            className="m-0 mb-3"
            style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}
          >
            The agentic economy needs a spending layer.
          </h3>
          <p className="m-0 mb-6 text-[15px]" style={{ color: 'var(--muted)', maxWidth: 460, margin: '0 auto 24px' }}>
            $10M+ in x402 volume on Solana. 35M+ agent transactions. Zero trust checks.
            REIN is the guardrail that makes autonomous agents safe to deploy at scale.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 48, padding: '0 24px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Try it on devnet <ArrowRight size={16} />
            </Link>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 24px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>
              View the product
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-6 mt-8">
        <div
          className="mx-auto px-6 flex items-center justify-between text-[13px] text-[var(--muted)]"
          style={{ maxWidth: 'var(--container)' }}
        >
          <div className="flex items-center gap-2">
            <ReinMark size={18} />
            <span>REIN © 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://github.com/reinprotocol" className="hover:text-[var(--fg)]">GitHub</a>
            <a href="https://docs.rein.so" className="hover:text-[var(--fg)]">Docs</a>
            <a href="https://x.com/reinprotocol" className="hover:text-[var(--fg)]">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
