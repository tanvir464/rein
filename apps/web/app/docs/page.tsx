import Link from 'next/link';
import { ArrowRight, Shield, Zap, Globe, Code2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Introduction' };

export default function DocsIndex() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>
          Introduction
        </span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
        REIN Documentation
      </h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        REIN is an on-chain spending policy engine for AI agents. Set daily caps, per-transaction
        limits, step-up thresholds, and allowlists — enforced atomically by an Anchor program on
        Solana, not by a SaaS database.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 48 }}>
        {[
          { icon: Zap, title: 'Quick start', desc: 'Zero to vault in 90 seconds', href: '/docs/quickstart' },
          { icon: Code2, title: 'Claude Code', desc: 'MCP server + rein init CLI', href: '/docs/integrations/claude-code' },
          { icon: Globe, title: 'Python SDK', desc: 'CrewAI, LangGraph, AutoGen', href: '/docs/integrations/python' },
          { icon: Shield, title: 'API reference', desc: 'rein_spend, balance, history', href: '/docs/api-reference/spend' },
        ].map(({ icon: Icon, title, desc, href }) => (
          <Link key={title} href={href} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-elevated)', textDecoration: 'none', transition: 'border-color 0.1s' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color="var(--accent-700)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>What REIN does</h2>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 24px', maxWidth: 600 }}>
        When your agent calls <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px' }}>rein.spend()</code>, the Anchor
        program checks all active policies inside the same atomic transaction. If any rule fails,
        the transaction reverts — no funds move. On success, a Receipt PDA is created
        in the same transaction as immutable proof.
      </p>

      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 40, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2 }}>
        <div style={{ color: 'var(--muted)' }}># Install the MCP server</div>
        <div><span style={{ color: 'var(--accent-700)' }}>npx</span> <span style={{ color: 'var(--fg)' }}>rein init</span></div>
        <div style={{ marginTop: 8, color: 'var(--muted)' }}># Or install the TypeScript SDK</div>
        <div><span style={{ color: 'var(--accent-700)' }}>npm</span> <span style={{ color: 'var(--fg)' }}>install @rein/sdk</span></div>
        <div style={{ marginTop: 8, color: 'var(--muted)' }}># Python</div>
        <div><span style={{ color: 'var(--accent-700)' }}>pip</span> <span style={{ color: 'var(--fg)' }}>install rein</span></div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Core concepts</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
        {[
          { term: 'Policy PDA', def: 'An on-chain account storing your spending rules. Written once, checked on every transaction. Cannot be altered by a SaaS backend.' },
          { term: 'Receipt PDA', def: 'Created atomically on each successful spend. Contains vault, recipient hash, amount, timestamp, and Solana tx signature. Immutable and disputable.' },
          { term: 'Step-up auth', def: 'Spends above your threshold pause and send you a push notification. You approve or deny with one tap — the agent resumes in under 1 second.' },
          { term: 'Vault', def: 'Your REIN account. Each vault has its own Policy PDA, USDC balance, and receipt history. One owner can manage multiple vaults for different agents.' },
        ].map(({ term, def }) => (
          <div key={term} style={{ display: 'flex', gap: 20, padding: '16px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ width: 140, flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--fg)', paddingTop: 1 }}>{term}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{def}</div>
          </div>
        ))}
      </div>

      <Link href="/docs/quickstart" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
        Get started — Quick start <ArrowRight size={14} />
      </Link>
    </div>
  );
}
