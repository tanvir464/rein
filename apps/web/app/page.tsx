import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck, Boxes, Zap, Building2, ArrowUpRight } from 'lucide-react';
import { LandingNav } from '../components/landing-nav';
import { DashboardMock } from '../components/dashboard-mock';
import { FeatureBento } from '../components/feature-bento';
import { StatsStrip } from '../components/animated-counter';
import { AnimatedTerminal } from '../components/animated-terminal';
import { FeatureShowcase } from '../components/feature-showcase';
import { SidetracksShowcase } from '../components/sidetracks-showcase';
import { ClaudeCodeLogo, CursorLogo, LangChainLogo, OpenAILogo, VercelAILogo, PythonLogo, CrewAILogo } from '../components/runtime-logos';

// ─── Data ────────────────────────────────────────────────────────────────────

const RUNTIMES = [
  { name: 'Claude Code', Logo: ClaudeCodeLogo },
  { name: 'Cursor', Logo: CursorLogo },
  { name: 'LangChain', Logo: LangChainLogo },
  { name: 'OpenAI Functions', Logo: OpenAILogo },
  { name: 'Vercel AI SDK', Logo: VercelAILogo },
  { name: 'CrewAI', Logo: CrewAILogo },
  { name: 'Python', Logo: PythonLogo },
];

const DATA_INTEGRATIONS = [
  { name: 'Umbra', tagline: 'Shielded UTXO spend' },
  { name: 'Arcium', tagline: 'Confidential receipts' },
  { name: 'Covalent · GoldRush', tagline: 'Reputation + USD insights' },
];


const PRICING = [
  {
    tier: 'Free',
    price: '$0',
    period: '',
    tagline: 'For personal agents and experimentation.',
    features: ['1 vault', '100 transactions/month', 'MCP + CLI', 'Activity feed (30 days)', 'Community support'],
    cta: 'Get started',
    href: '/onboarding',
    highlight: false,
  },
  {
    tier: 'Pro',
    price: '$20',
    period: '/mo',
    tagline: 'For developers running agents in production.',
    features: ['5 vaults', 'Unlimited transactions', 'All runtimes + Python SDK', 'Activity feed (1 year)', 'Step-up push notifications', 'Priority support'],
    cta: 'Start free trial',
    href: '/onboarding',
    highlight: true,
  },
  {
    tier: 'Team',
    price: '$200',
    period: '/mo',
    tagline: 'For teams deploying multiple agents.',
    features: ['Unlimited vaults', 'Shared policy templates', 'Audit export (CSV + JSON)', 'Webhook + Telegram alerts', 'Squads multisig', 'SLA + Slack'],
    cta: 'Contact sales',
    href: '/onboarding',
    highlight: false,
  },
  {
    tier: 'Enterprise',
    price: 'Custom',
    period: '',
    tagline: 'For compliance-conscious teams.',
    features: ['Custom policy rules', 'SSO / SAML', 'On-prem key broker', 'Quarterly security review', 'Custom SLA', 'Invoice billing'],
    cta: 'Talk to us',
    href: '/onboarding',
    highlight: false,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--bg)' }}>
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 80,
          paddingBottom: 80,
          backgroundImage: "url('/hero-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
        }}
      >
        <div className="mx-auto px-6" style={{ maxWidth: 'var(--container)', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-pill)] border text-[12px] font-medium"
              style={{
                borderColor: 'rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(255,255,255,0.25)',
                color: '#fff',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#fff' }} />
              Live on Solana devnet · 35M+ agent transactions secured
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-center"
            style={{
              fontSize: 'clamp(40px, 6vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.04,
              maxWidth: 760,
              margin: '0 auto',
              color: '#fff',
              textShadow: '0 2px 12px rgba(0,0,0,0.18)',
            }}
          >
            Give your agent the rein,{' '}
            <span style={{ color: '#FFE896' }}>keep the reins.</span>
          </h1>

          {/* Subhead */}
          <p
            className="text-center"
            style={{ fontSize: 18, color: 'rgba(255,255,255,0.88)', maxWidth: 520, margin: '20px auto 0', lineHeight: 1.6, textShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
          >
            Trust-gated wallet for AI agents. Public policy, private spend, treasury-grade insights.
            Drop into any runtime in 30 seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 h-12 px-7 text-[15px] font-semibold rounded-[var(--radius-pill)]"
              style={{ background: 'hsla(174, 70%, 12%, 1)', color: '#fff', transition: 'filter var(--dur-instant) var(--ease-snap)' }}
            >
              Start for free <ArrowRight size={15} />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-1 h-12 px-5 text-[15px] font-medium"
              style={{ color: '#fff', transition: 'opacity var(--dur-instant) var(--ease-snap)' }}
            >
              See how it works <ArrowRight size={14} />
            </Link>
          </div>

          {/* Product mock — floats on top of illustration, fades into page below */}
          <div className="flex justify-center mt-14">
            <div
              style={{
                maxWidth: 860,
                width: '100%',
                filter: 'drop-shadow(0 40px 100px rgba(0,0,0,0.28))',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <DashboardMock />
            </div>
          </div>
        </div>

        {/* Fade to page background */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: 'linear-gradient(to bottom, transparent, var(--bg))',
            pointerEvents: 'none',
          }}
        />
      </section>

      {/* ── Stats strip (scroll-triggered) ───────────────────────────────── */}
      <StatsStrip />

      {/* ── Runtimes strip ────────────────────────────────────────────────── */}
      <section
        className="py-4 sm:py-[18px]"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', overflow: 'hidden' }}
      >
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: 'var(--container)' }}>
          {/* Row 1: Runtimes. Stacks label above pills on mobile, inline on sm+. */}
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
            <span className="sm:mr-2" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              Drop in to
            </span>
            <div className="flex flex-wrap justify-center gap-2 sm:contents">
              {RUNTIMES.map(({ name, Logo }) => (
                <span
                  key={name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '5px 12px 5px 8px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Logo size={16} />
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Row 2: Privacy & data. Same responsive structure. */}
          <div className="flex flex-col items-center gap-2 mt-4 pt-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 sm:mt-3 sm:pt-3" style={{ borderTop: '1px dashed var(--border)' }}>
            <span className="sm:mr-2" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              Privacy & data
            </span>
            <div className="flex flex-wrap justify-center gap-2 sm:contents">
              {DATA_INTEGRATIONS.map(({ name, tagline }) => (
                <span
                  key={name}
                  title={tagline}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '5px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8, height: 8, borderRadius: 999,
                      background: 'var(--accent-700)',
                    }}
                  />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature bento ─────────────────────────────────────────────────── */}
      <div id="how-it-works">
        <FeatureBento />
      </div>

      {/* ── Feature showcase (VC: real-world use cases) ───────────────────── */}
      <FeatureShowcase />

      {/* ── Side-tracks: private spend + reputation + USD insights ────────── */}
      <SidetracksShowcase />

      {/* ── Install strip ─────────────────────────────────────────────────── */}
      <section
        id="install"
        style={{
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '96px 0',
        }}
      >
        <div className="mx-auto px-6" style={{ maxWidth: 'var(--container)' }}>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-700)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
                30-second setup
              </p>
              <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
                One command.
                <br />Every runtime.
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.7, margin: '0 0 28px' }}>
                The CLI detects Claude Code, Cursor, LangChain, OpenAI, Vercel AI, and Python automatically — and writes the config for you.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { runtime: 'Claude Code', cmd: 'npx @rein/cli init' },
                  { runtime: 'Python / CrewAI', cmd: 'pip install rein' },
                  { runtime: 'LangChain', cmd: 'npm install @rein/langchain' },
                ].map(({ runtime, cmd }) => (
                  <div key={runtime} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', width: 110, flexShrink: 0 }}>{runtime}</span>
                    <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-700)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 6 }}>
                      {cmd}
                    </code>
                  </div>
                ))}
              </div>
            </div>
            {/* Animated terminal */}
            <AnimatedTerminal />
          </div>
        </div>
      </section>

      {/* ── Why now ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 0' }}>
        <div className="mx-auto px-6" style={{ maxWidth: 'var(--container)' }}>
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-700)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
                Why now
              </p>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 16px' }}>
                Four forces are
                <br />converging.
              </h2>
              <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
                x402 hit $10M+ on Solana. Visa and Stripe added agent commerce protocols.
                MCP became the universal tool layer. Embedded wallets made onboarding under 30 seconds.
                Nobody has built the guardrail in the middle.{' '}
                <span style={{ color: 'var(--fg)', fontWeight: 500 }}>That's REIN.</span>
              </p>
              <a
                href="https://insignia.vc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-6 text-[13px] font-medium"
                style={{ color: 'var(--accent-700)' }}
              >
                Insignia VC — "Nobody has built this" <ArrowUpRight size={13} />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { Icon: Zap, label: '$10M+ x402 volume', sub: 'on Solana since launch' },
                { Icon: ShieldCheck, label: '0 trust checks', sub: 'on 20M monthly txns today' },
                { Icon: Boxes, label: 'MCP is universal', sub: 'Claude, Cursor, VS Code, Continue' },
                { Icon: Building2, label: 'Visa + Stripe', sub: 'bridging fiat to agent rails' },
              ].map(({ Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex flex-col gap-2 p-5 rounded-[var(--radius-lg)] border border-[var(--border)]"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon size={16} style={{ color: 'var(--accent-700)' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '96px 0',
        }}
      >
        <div className="mx-auto px-6" style={{ maxWidth: 'var(--container)' }}>
          <div className="text-center mb-12">
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-700)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
              Pricing
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
              Start free. Scale when your agents do.
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {PRICING.map(({ tier, price, period, tagline, features, cta, href, highlight }) => (
              <div
                key={tier}
                className="flex flex-col rounded-[var(--radius-lg)] p-6 gap-5"
                style={{
                  background: highlight ? 'var(--accent-700)' : 'var(--bg)',
                  border: `1px solid ${highlight ? 'var(--accent-700)' : 'var(--border)'}`,
                  color: highlight ? '#fff' : 'var(--fg)',
                  position: 'relative',
                }}
              >
                {highlight && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -11,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: 999,
                      background: 'var(--fg)',
                      color: 'var(--bg)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Most popular
                  </span>
                )}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: 6 }}>
                    {tier}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                      {price}
                    </span>
                    {period && <span style={{ fontSize: 14, opacity: 0.65 }}>{period}</span>}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.7, lineHeight: 1.4 }}>{tagline}</p>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0, listStyle: 'none', flex: 1 }}>
                  {features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, opacity: 0.85 }}>
                      <Check size={12} style={{ flexShrink: 0, marginTop: 3 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={href}>
                  <button
                    style={{
                      width: '100%',
                      height: 40,
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      background: highlight ? '#fff' : 'var(--accent-700)',
                      color: highlight ? 'var(--accent-900)' : '#fff',
                      border: 'none',
                      transition: 'opacity 0.09s ease',
                    }}
                  >
                    {cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 0' }}>
        <div className="mx-auto px-6 text-center" style={{ maxWidth: 'var(--prose)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-700)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
            What&apos;s next
          </p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
            This is just the beginning.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.7, margin: '0 0 32px' }}>
            Key broker, mainnet, enterprise, multi-chain — see the full 1-year vision we&apos;re building
            toward to make every AI agent spending layer safe to deploy at scale.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-2 h-12 px-7 text-[15px] font-semibold rounded-[var(--radius-pill)]"
              style={{ background: 'var(--fg)', color: 'var(--bg)' }}
            >
              View full roadmap <ArrowRight size={15} />
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 h-12 px-7 text-[15px] font-medium rounded-[var(--radius-pill)] border border-[var(--border)]"
              style={{ color: 'var(--fg)' }}
            >
              Try on devnet
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '32px 0',
          background: 'var(--bg-elevated)',
        }}
      >
        <div
          className="mx-auto px-6 flex flex-wrap items-center justify-between gap-4"
          style={{ maxWidth: 'var(--container)', fontSize: 13, color: 'var(--muted)' }}
        >
          <div className="flex items-center gap-6">
            <span style={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg)' }}>REIN</span>
            <span>© 2026</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Trust-gated wallet for AI agents.</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/tanvir464/rein"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--fg)]"
              style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}
            >
              GitHub
            </a>
            <Link href="/roadmap" className="hover:text-[var(--fg)]" style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}>
              Roadmap
            </Link>
            <a href="https://docs.rein.so" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--fg)]" style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}>
              Docs
            </a>
            <a href="https://x.com/reinprotocol" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--fg)]" style={{ transition: 'color var(--dur-instant) var(--ease-snap)' }}>
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
