import Link from 'next/link';
import { ArrowRight, ShieldCheck, Lock, List, Zap } from 'lucide-react';
import { LandingNav } from '../../../components/landing-nav';

export const metadata = { title: 'On-chain Policies — REIN', description: 'Daily caps, per-tx limits, allowlists and step-up thresholds enforced by Anchor on Solana. A compromised service cannot bypass them.' };

const RULES = [
  { icon: Zap, name: 'Daily cap', desc: 'Max USDC your agent can spend per UTC day across all transactions.', eg: '"daily_cap_usdc": 50.00' },
  { icon: Lock, name: 'Per-tx limit', desc: 'Maximum spend on a single transaction — even if daily cap has room.', eg: '"per_tx_cap_usdc": 5.00' },
  { icon: ShieldCheck, name: 'Step-up threshold', desc: 'Transactions above this pause and require your live approval.', eg: '"step_up_threshold": 10.00' },
  { icon: List, name: 'Allowlist / blocklist', desc: 'Merkle-root-based URL allowlist. Blocklist overrides permanently.', eg: '"allowlist": ["api.brave.com"]' },
];

export default function PoliciesPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <LandingNav />
      {/* Hero */}
      <section style={{ padding: '96px 24px 80px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--accent-100)', marginBottom: 20 }}>
            <ShieldCheck size={24} color="var(--accent-700)" />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-700)', margin: '0 0 14px' }}>On-chain enforcement</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 20px' }}>
            Policies your agent<br />cannot bypass.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Spending rules live in an Anchor program on Solana — checked atomically inside every transaction. A compromised REIN service, a jailbroken prompt, or a rogue dependency cannot override them.
          </p>
          <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Set your first policy <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Policy rules */}
      <section style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-700)', marginBottom: 10 }}>What you can enforce</p>
        <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 48px' }}>Every rule, on-chain.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {RULES.map(({ icon: Icon, name, desc, eg }) => (
            <div key={name} style={{ padding: '24px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={18} color="var(--accent-700)" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>{desc}</div>
              <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-700)', background: 'var(--accent-100)', padding: '3px 8px', borderRadius: 5 }}>{eg}</code>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 32px' }}>How on-chain enforcement works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { n: '01', title: 'Policy stored on Solana', body: 'When you set a policy, REIN writes it to a Policy PDA — a program-derived account. No database. No API. The rules live on-chain.' },
              { n: '02', title: 'Every spend checks the program', body: 'When your agent calls rein.spend(), the Anchor program reads the Policy PDA and validates: daily cap not exceeded, per-tx under limit, recipient on allowlist. All inside the same atomic transaction.' },
              { n: '03', title: 'Violation = rejection', body: 'If any rule fails, the transaction reverts. No funds move. The agent receives a typed PolicyViolationError with the specific reason.' },
              { n: '04', title: 'Receipt created atomically', body: 'On success, a Receipt PDA is created in the same transaction — immutable proof the spend happened, attached to your vault, disputable any time.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Ready to enforce policies on your agent?</h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 28px' }}>Set up in 90 seconds. Works with Claude Code, Cursor, LangChain, and Python.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Get started <ArrowRight size={14} />
          </Link>
          <Link href="/#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>
            See how it works
          </Link>
        </div>
      </section>
    </div>
  );
}
