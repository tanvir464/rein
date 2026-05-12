import Link from 'next/link';
import { ArrowRight, Shield, Zap, Globe, TrendingUp, DollarSign, Users, Lock, CheckCircle2, ExternalLink } from 'lucide-react';
import { ReinMark, ReinWordmark } from '../../components/rein-mark';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Investors — REIN',
  description: 'REIN: On-chain spending policies for AI agents. Product overview and funding round for investors.',
};

/* ─── slide wrapper ───────────────────────────────────────────────────────── */

function Slide({ id, children, dark, accent }: { id?: string; children: React.ReactNode; dark?: boolean; accent?: boolean }) {
  const bg = dark ? '#0a0f0e' : accent ? 'var(--accent-900)' : 'var(--bg)';
  const color = dark || accent ? '#fff' : 'var(--fg)';
  return (
    <section
      id={id}
      style={{
        minHeight: '100vh',
        background: bg,
        color,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderBottom: dark || accent ? '1px solid rgba(255,255,255,0.07)' : '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', padding: '80px 48px' }}>
        {children}
      </div>
    </section>
  );
}

function SlideLabel({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: light ? 'rgba(255,255,255,0.45)' : 'var(--accent-700)',
      margin: '0 0 18px',
    }}>
      {children}
    </p>
  );
}

function Heading({ children, light, size = 52 }: { children: React.ReactNode; light?: boolean; size?: number }) {
  return (
    <h2 style={{
      fontSize: `clamp(32px, 5vw, ${size}px)`,
      fontWeight: 700,
      letterSpacing: '-0.04em',
      lineHeight: 1.05,
      margin: '0 0 24px',
      color: light ? '#fff' : 'var(--fg)',
    }}>
      {children}
    </h2>
  );
}

function Sub({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p style={{
      fontSize: 18,
      color: light ? 'rgba(255,255,255,0.65)' : 'var(--muted)',
      lineHeight: 1.7,
      margin: '0 0 40px',
      maxWidth: 620,
    }}>
      {children}
    </p>
  );
}

/* ─── reusable blocks ─────────────────────────────────────────────────────── */

function StatBox({ value, label, light }: { value: string; label: string; light?: boolean }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 160,
      padding: '28px 24px',
      borderRadius: 16,
      background: light ? 'rgba(255,255,255,0.07)' : 'var(--bg-elevated)',
      border: `1px solid ${light ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
    }}>
      <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: light ? '#fff' : 'var(--fg)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: light ? 'rgba(255,255,255,0.5)' : 'var(--muted)', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body, light }: { icon: typeof Shield; title: string; body: string; light?: boolean }) {
  return (
    <div style={{
      padding: '24px',
      borderRadius: 16,
      border: `1px solid ${light ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
      background: light ? 'rgba(255,255,255,0.05)' : 'var(--bg-elevated)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: light ? 'rgba(255,255,255,0.1)' : 'var(--accent-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Icon size={20} color={light ? '#fff' : 'var(--accent-700)'} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: light ? '#fff' : 'var(--fg)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: light ? 'rgba(255,255,255,0.55)' : 'var(--muted)', lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

function CheckRow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
      <CheckCircle2 size={16} color={light ? 'hsla(169,70%,72%,1)' : 'var(--accent-700)'} style={{ flexShrink: 0, marginTop: 3 }} />
      <span style={{ fontSize: 15, color: light ? 'rgba(255,255,255,0.8)' : 'var(--fg)', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

/* ─── nav ─────────────────────────────────────────────────────────────────── */

function PitchNav() {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      height: 56,
      background: 'rgba(10,15,14,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <ReinMark size={22} color="#fff" />
        <ReinWordmark size={14} color="#fff" />
        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>For Investors</span>
      </Link>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 16px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          Try devnet <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function PitchPage() {
  return (
    <div style={{ background: '#0a0f0e' }}>
      <PitchNav />

      {/* 01 — Cover */}
      <section style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, hsla(173,80%,20%,0.45) 0%, transparent 70%), #0a0f0e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <ReinMark size={48} color="hsla(173,80%,56%,1)" />
          <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.04em', color: '#fff' }}>REIN</span>
        </div>
        <p style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.9)', margin: '0 0 16px', maxWidth: 640 }}>
          On-chain spending policies<br />for AI agents.
        </p>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: '0 0 56px', maxWidth: 480 }}>
          The missing guardrail between autonomous agents and real money.
          Enforced by Anchor, auditable on Solana, live on devnet today.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
          {[
            { v: 'Q2 2026', l: 'Hackathon built' },
            { v: '16', l: 'Milestones shipped' },
            { v: 'Devnet', l: 'Live today' },
            { v: 'Seed', l: 'Round open' },
          ].map(({ v, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>{v}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64, display: 'flex', gap: 12 }}>
          <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 48, padding: '0 24px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            Try on devnet <ArrowRight size={15} />
          </Link>
          <Link href="/roadmap" style={{ display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 24px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>
            View roadmap
          </Link>
        </div>
      </section>

      {/* 02 — Problem */}
      <Slide dark>
        <SlideLabel light>01 — The problem</SlideLabel>
        <Heading light size={48}>AI agents are spending real money.<br />With zero guardrails.</Heading>
        <Sub light>
          The x402 protocol enables AI agents to make autonomous USDC payments on Solana.
          By Q2 2026, agents have processed <strong style={{ color: '#fff' }}>$10M+ in volume</strong> across 35M+ transactions —
          with no trust checks, no caps, no audit trail.
        </Sub>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 8 }}>
          {[
            { icon: Lock, title: 'No spending limits', body: 'A jailbroken prompt or buggy tool can drain a wallet. There is no on-chain enforcement stopping it.' },
            { icon: Shield, title: 'No audit trail', body: 'Payments happen off-chain or in SaaS DBs. A compromised backend can alter or delete spend history.' },
            { icon: Zap, title: 'No human override', body: 'When an agent decides to pay $2,000 to an unknown API, there is no pause-for-approval mechanism.' },
            { icon: Globe, title: 'No multi-runtime support', body: 'Every framework (LangChain, CrewAI, Claude Code) rolls its own spend logic — no shared standard.' },
          ].map((c) => (
            <FeatureCard key={c.title} {...c} light />
          ))}
        </div>
      </Slide>

      {/* 02b — Enterprise unlock (sidetracks) */}
      <Slide dark>
        <SlideLabel light>01b — Enterprise unlock</SlideLabel>
        <Heading light size={48}>Public spend<br />is the ceiling.</Heading>
        <Sub light>
          A public ledger is fine for hackathons. For any business past dev-mode, every on-chain payment
          leaks the things that win or lose deals.
        </Sub>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
          {[
            { title: 'Strategic leak', body: 'Every payment reveals your stack. Competitors index your wallet and replicate your infrastructure choices in a quarter.' },
            { title: 'Customer leak', body: 'Counterparty addresses become your customer list. CRM-as-a-service for adversaries — for free, in real time.' },
            { title: 'Traction leak', body: 'Spend velocity = product traction. Investors and competitors get to read it before you publish it.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ padding: '24px 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{body}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 24px', borderRadius: 12, border: '1px solid rgba(169,239,217,0.18)', background: 'rgba(23,112,94,0.12)', fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, fontVariantNumeric: 'tabular-nums' }}>
          <strong style={{ color: '#fff' }}>The punchline:</strong> No business will run autonomous agent commerce on a public ledger.
          So nobody does — yet. REIN keeps policy public and verifiable, and routes execution through
          Umbra&apos;s shielded UTXO pool. Solscan sees a commitment. The owner sees everything.
        </div>
      </Slide>

      {/* 03 — Solution */}
      <Slide dark>
        <SlideLabel light>02 — Our solution</SlideLabel>
        <Heading light size={48}>REIN is the trust layer<br />for agent commerce.</Heading>
        <Sub light>
          An Anchor program on Solana enforces spending rules inside every transaction — atomically.
          A compromised SaaS backend, a prompt injection, or a rogue dependency cannot bypass them.
        </Sub>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ gridColumn: '1 / -1', padding: '24px 28px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Daily cap', eg: '$50/day' },
                { label: 'Per-tx limit', eg: '$5/tx' },
                { label: 'Step-up threshold', eg: 'pause > $10' },
                { label: 'Allowlist / blocklist', eg: 'Merkle root' },
                { label: 'Expiry TTL', eg: '90 days' },
                { label: 'Pause / dispute', eg: '1-click' },
              ].map(({ label, eg }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
                  <CheckCircle2 size={13} color="hsla(169,70%,72%,1)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>{eg}</span>
                </div>
              ))}
            </div>
          </div>

          {[
            { icon: Shield, title: 'On-chain enforcement', body: 'Rules live in a Policy PDA — checked atomically inside every spend transaction. Not in a SaaS DB.' },
            { icon: CheckCircle2, title: 'Immutable receipts', body: 'SpendReceipt PDA created in the same tx. Every payment is auditable, disputable, refundable on-chain.' },
            { icon: Zap, title: 'Step-up approval', body: 'Payments above threshold pause. You approve via push notification + biometric. Agent resumes in <1s.' },
            { icon: Globe, title: 'Drop-in for any runtime', body: 'MCP server works with Claude Code, Cursor, Claude Desktop. TypeScript + Python SDKs for LangChain, CrewAI, AutoGen.' },
          ].map((c) => (
            <FeatureCard key={c.title} {...c} light />
          ))}
        </div>
      </Slide>

      {/* 03b — Treasury-grade (sidetracks) */}
      <Slide dark>
        <SlideLabel light>02b — Treasury-grade insights</SlideLabel>
        <Heading light size={48}>A wallet log<br />is not a ledger.</Heading>
        <Sub light>
          Token counts don&apos;t get sign-off. Dollar totals, week-over-week deltas, and real anomaly
          detection do. Every receipt is enriched with USD price at time-of-spend via GoldRush.
        </Sub>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          {/* Greyed-out: current state */}
          <div style={{ padding: '26px 24px', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', opacity: 0.55 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Today, everywhere else</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em', marginBottom: 14, fontVariantNumeric: 'tabular-nums' }}>
              Agent spent 12.5 USDC<br />on inference.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Token count. No USD. No reputation. No WoW. No anomalies. <strong style={{ color: 'rgba(255,255,255,0.55)' }}>CFO bounces it.</strong>
            </div>
          </div>

          {/* Live: REIN */}
          <div style={{ padding: '26px 24px', borderRadius: 16, border: '1px solid rgba(169,239,217,0.4)', background: 'linear-gradient(180deg, rgba(23,112,94,0.18), rgba(23,112,94,0.05))' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsla(169,70%,72%,1)', marginBottom: 14 }}>REIN — live</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: 14, fontVariantNumeric: 'tabular-nums' }}>
              $1,247.38 across 380 calls.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55, fontVariantNumeric: 'tabular-nums' }}>
              <span>OpenAI <strong style={{ color: '#fff' }}>62%</strong> · Helius <strong style={{ color: '#fff' }}>28%</strong> · other 10%</span>
              <span><span style={{ color: 'hsla(169,70%,72%,1)' }}>+23%</span> WoW · 3 anomalies flagged</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Same data. GoldRush-enriched.</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', borderRadius: 12, border: '1px solid rgba(169,239,217,0.18)', background: 'rgba(23,112,94,0.12)', fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
          <strong style={{ color: '#fff' }}>The punchline:</strong> Sign-off goes from &ldquo;I don&apos;t know what I&apos;m approving&rdquo;
          to &ldquo;I do.&rdquo; Outlier amounts (mean + 2σ), new-recipient flags, recipient reputation grading on every
          allowlist entry — computed live, cached at the edge.
        </div>
      </Slide>

      {/* 03c — Trust model (sidetracks) */}
      <Slide dark>
        <SlideLabel light>02c — Trust model</SlideLabel>
        <Heading light size={44}>Four keys.<br />Owner key never moves.</Heading>
        <Sub light>
          REIN keeps the owner&apos;s key off the hot path entirely. Policy is enforced on-chain. Private spend
          is brokered by a sidecar. Auditors see only what the owner scopes to them.
        </Sub>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { name: 'Owner key', loc: 'Phantom / Backpack — never leaves the wallet', role: 'Signs policy edits, dispute, refund. Never signs the private path.' },
            { name: 'Agent key', loc: 'Bound to a vault, scoped by Policy PDA', role: 'Signs public spend; on-chain rules reject everything outside the policy.' },
            { name: 'Sidecar key (Fly.io)', loc: 'Isolated service · Umbra UTXO broker', role: 'Builds and signs shielded UTXO creation tx. Sees commitments — not amounts, not recipients.' },
            { name: 'View key (browser-only)', loc: 'Owner-derived via signed message · never crosses the network', role: 'Decrypts confidential receipts client-side. Can be shared with auditors scope-by-scope.' },
          ].map(({ name, loc, role }) => (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 16, padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{name}</div>
              <div style={{ fontSize: 12.5, color: 'hsla(169,70%,72%,1)', fontFamily: 'var(--font-mono)' }}>{loc}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{role}</div>
            </div>
          ))}
        </div>
      </Slide>

      {/* 04 — Product */}
      <Slide dark>
        <SlideLabel light>03 — Product</SlideLabel>
        <Heading light size={44}>Everything shipped. Today.</Heading>
        <Sub light>
          Built in one hackathon sprint. 16 milestones shipped, devnet live, real transactions confirmed.
        </Sub>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { category: 'On-chain program', items: ['7 Anchor instructions', 'Policy PDA + Receipt PDA', 'Daily cap, per-tx, step-up, allowlist, expiry, pause, dispute'] },
            { category: 'MCP server', items: ['rein_spend · rein_balance · rein_history · request_step_up', 'Works in Claude Code, Cursor, Claude Desktop out of the box', 'rein init CLI — installs MCP config in any runtime'] },
            { category: 'SDKs', items: ['TypeScript SDK — LangChain tool wrappers, Vercel AI SDK helpers, OpenAI Functions JSON schema', 'Python SDK — CrewAI / LangGraph / AutoGen compatible', 'pip install rein · npm install @rein/sdk'] },
            { category: 'Dashboard', items: ['Policy editor, activity feed, step-up UI, spend insights', 'Real-time WebSocket receipts via Helius webhook', 'Cloudflare Workers + Durable Objects activity stream'] },
          ].map(({ category, items }) => (
            <div key={category} style={{ display: 'flex', gap: 20, padding: '18px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', alignItems: 'flex-start' }}>
              <div style={{ width: 140, fontSize: 12, fontWeight: 700, color: 'hsla(169,70%,72%,1)', flexShrink: 0, paddingTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{category}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Slide>

      {/* 05 — Traction */}
      <Slide dark>
        <SlideLabel light>04 — Traction</SlideLabel>
        <Heading light size={48}>The agentic economy<br />is already here.</Heading>
        <Sub light>
          x402 volume is real. REIN ships into a live ecosystem with immediate distribution through the
          Solana ecosystem, MCP tooling, and AI developer communities.
        </Sub>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
          <StatBox value="$10M+" label="x402 volume on Solana devnet" light />
          <StatBox value="35M+" label="Agent transactions confirmed" light />
          <StatBox value="16" label="Milestones shipped (Q2 2026)" light />
          <StatBox value="<2s" label="End-to-end spend latency" light />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {[
            { title: 'MCP ecosystem', body: "Claude Code has 500k+ developers. REIN's MCP server drops in with a single rein init — zero configuration." },
            { title: 'Python SDK', body: "CrewAI, LangGraph, AutoGen combined have millions of monthly downloads. pip install rein is the distribution." },
            { title: 'Solana Foundation', body: 'Eligible for Q3 2026 RFP grant for security audit funding. Squads multisig partnership for mainnet upgrade authority.' },
            { title: 'Hackathon credibility', body: 'Built and shipped in one sprint with real on-chain program, MCP integration, and a live dashboard. Not a demo.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </div>
      </Slide>

      {/* 06 — Market */}
      <Slide dark>
        <SlideLabel light>05 — Market</SlideLabel>
        <Heading light size={48}>Every autonomous agent<br />is a potential customer.</Heading>
        <Sub light>
          AI agent commerce is nascent but accelerating fast. REIN targets the infrastructure layer —
          not applications — which means it rides every vertical simultaneously.
        </Sub>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {[
            { label: 'TAM', value: '$18B', sub: 'AI agent infrastructure\nspend by 2028 (a16z est.)' },
            { label: 'SAM', value: '$2.4B', sub: 'Solana + MCP-compatible\nagent deployments' },
            { label: 'SOM (Y1)', value: '$12M', sub: 'Policy vaults × $15/mo\navg. in first 12 months' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ padding: '32px 24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1, marginBottom: 10 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
          <strong style={{ color: '#fff' }}>Why now:</strong> Visa's Trusted Agent Protocol, Stripe's Agent Commerce Protocol, and Anthropic's MCP standard all launched in 2025—2026. The x402 payment standard has proven demand. The missing piece is the policy and trust layer. REIN is that piece.
        </div>
      </Slide>

      {/* 07 — Business model */}
      <Slide dark>
        <SlideLabel light>06 — Business model</SlideLabel>
        <Heading light size={48}>Simple pricing.<br />Usage-aligned revenue.</Heading>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {[
            {
              tier: 'Free',
              price: '$0',
              sub: 'forever',
              features: ['1 vault', 'Basic policy (cap + expiry)', 'On-chain receipts', 'MCP server access'],
              highlight: false,
            },
            {
              tier: 'Pro',
              price: '$29',
              sub: '/ month',
              features: ['Unlimited vaults', 'All 7 policy controls', 'Step-up push notifications', 'Spend insights + anomaly flags', 'CSV / JSON export', 'Priority support'],
              highlight: true,
            },
            {
              tier: 'Enterprise',
              price: 'Custom',
              sub: 'annual',
              features: ['SSO + SLA', 'Custom domains', 'Audit log export', 'Key broker (rein.proxy)', 'Squads multisig integration', 'Dedicated support'],
              highlight: false,
            },
          ].map(({ tier, price, sub, features, highlight }) => (
            <div key={tier} style={{
              padding: '28px 24px',
              borderRadius: 16,
              border: `2px solid ${highlight ? 'var(--accent-700)' : 'rgba(255,255,255,0.1)'}`,
              background: highlight ? 'rgba(23,112,94,0.15)' : 'rgba(255,255,255,0.03)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: highlight ? 'hsla(169,70%,72%,1)' : 'rgba(255,255,255,0.4)', marginBottom: 10 }}>{tier}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.04em', color: '#fff' }}>{price}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{sub}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {features.map((f) => <CheckRow key={f} light>{f}</CheckRow>)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 200, padding: '18px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Revenue stream 2</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Usage fees</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>0.1% on proxied API spend via rein.proxy — agents never see the key, REIN earns on every call.</div>
          </div>
          <div style={{ flex: 1, minWidth: 200, padding: '18px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Revenue stream 3</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Agent marketplace</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Policy templates sold peer-to-peer. 20% platform cut on each sale. Planned Q4 2026.</div>
          </div>
        </div>
      </Slide>

      {/* 08 — Roadmap */}
      <Slide dark>
        <SlideLabel light>07 — Roadmap</SlideLabel>
        <Heading light size={44}>Mainnet in Q3.<br />Enterprise in Q4.</Heading>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            {
              period: 'Q2 2026 — Done',
              color: 'hsla(169,70%,72%,1)',
              items: ['Anchor program — 7 instructions, Policy + Receipt PDAs', 'MCP server + TypeScript + Python SDKs', 'Owner dashboard — policy editor, activity, step-up, insights'],
            },
            {
              period: 'Q3 2026',
              color: 'hsla(39,100%,57%,1)',
              items: ['External security audit (Solana Foundation RFP)', 'Mainnet launch — Squads multisig upgrade authority', 'Immunefi bug bounty + key broker (2-of-3 Shamir)'],
            },
            {
              period: 'Q4 2026',
              color: 'rgba(255,255,255,0.3)',
              items: ['Enterprise tier — SSO, SLA, audit export', 'Mobile app — push approvals on iOS + Android', 'Agent marketplace — sell policy templates'],
            },
            {
              period: '2027',
              color: 'rgba(255,255,255,0.2)',
              items: ['Multi-chain — EVM (Base, Arbitrum) + Cosmos IBC', 'KYA — Know Your Agent on-chain identity attestations', 'Visa + Stripe bridge — x402 on fiat rails'],
            },
          ].map(({ period, color, items }, i) => (
            <div key={period} style={{ display: 'flex', gap: 20, paddingBottom: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0, paddingTop: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {i < 3 && <div style={{ width: 1, flex: 1, minHeight: 20, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: 8 }}>{period}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {items.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', marginTop: 7, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: i === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Slide>

      {/* 09 — Why REIN wins */}
      <Slide dark>
        <SlideLabel light>08 — Defensibility</SlideLabel>
        <Heading light size={44}>Why REIN wins<br />the infrastructure race.</Heading>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
          {[
            {
              title: 'On-chain moat',
              body: "Policy PDAs and Receipt PDAs cannot be censored, altered, or deleted. An equivalent SaaS product is always one database breach away from failure. REIN's on-chain model is the only trustworthy option for regulated deployments.",
            },
            {
              title: 'MCP standard lock-in',
              body: "The rein init CLI installs REIN's MCP config into Claude Code, Cursor, and Claude Desktop in seconds. Being the first policy tool in the MCP ecosystem creates switching-cost network effects for every agent developer who adopts it.",
            },
            {
              title: 'Protocol-level reach',
              body: "rein.proxy ships in Q3 2026. Once agents route API keys through REIN's proxy, we earn on every OpenAI, AWS, and GitHub call — not just Solana payments. This is a cross-chain, cross-runtime trust layer.",
            },
            {
              title: 'Timing advantage',
              body: 'Visa TAP, Stripe ACP, and Anthropic MCP all launched in 2025–2026. The window for the canonical trust-layer standard is open now. The team that ships mainnet in Q3 2026 owns the ecosystem.',
            },
          ].map(({ title, body }) => (
            <div key={title} style={{ padding: '22px 24px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{body}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '18px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
          <strong style={{ color: '#fff' }}>Competitive landscape:</strong> No direct competitor combines on-chain enforcement + MCP tooling + key brokering. Existing solutions (SaaS rate limiters, wallet guards) operate in a different trust model — they can be bypassed. REIN cannot.
        </div>
      </Slide>

      {/* 10 — The ask */}
      <section style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 80% 60% at 50% 110%, hsla(173,80%,20%,0.5) 0%, transparent 60%), #0a0f0e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <SlideLabel light>09 — The ask</SlideLabel>
        <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.04em', color: '#fff', margin: '0 0 16px', lineHeight: 1.05 }}>
          $1.5M seed round.
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', margin: '0 0 56px', maxWidth: 520 }}>
          Targeting close by end of Q3 2026 — aligned with mainnet launch and audit completion.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, width: '100%', maxWidth: 720, marginBottom: 56 }}>
          {[
            { pct: '40%', use: 'Security audit + Immunefi bounty', color: 'var(--accent-700)' },
            { pct: '30%', use: 'Engineering — key broker, mobile app', color: 'hsla(173,70%,50%,1)' },
            { pct: '20%', use: 'Growth + developer relations', color: 'hsla(173,60%,40%,1)' },
            { pct: '10%', use: 'Legal + compliance (KYA framework)', color: 'hsla(173,50%,30%,1)' },
          ].map(({ pct, use, color }) => (
            <div key={use} style={{ padding: '22px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color, marginBottom: 6 }}>{pct}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{use}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
          <a
            href="mailto:codesurgeofficial@gmail.com"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 52, padding: '0 28px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 16, textDecoration: 'none' }}
          >
            Contact the team <ArrowRight size={16} />
          </a>
          <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 52, padding: '0 28px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: 16, textDecoration: 'none' }}>
            Try on devnet
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
          {[
            { label: 'Product', href: '/' },
            { label: 'Roadmap', href: '/roadmap' },
            { label: 'Docs', href: '/docs', external: false },
            { label: 'GitHub', href: 'https://github.com/tanvir464/rein', external: true },
          ].map(({ label, href, external }) => (
            <a
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
            >
              {label}
              {external && <ExternalLink size={11} />}
            </a>
          ))}
        </div>

        <p style={{ marginTop: 64, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          REIN © 2026 · Built on Solana · Devnet live
        </p>
      </section>
    </div>
  );
}
