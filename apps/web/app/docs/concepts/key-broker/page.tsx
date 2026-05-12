import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Key Broker' };

export default function KeyBrokerPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>Concepts</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>Key Broker</h1>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 9999, background: 'var(--tone-warning-bg)', border: '1px solid var(--warning)', marginBottom: 32 }}>
        <Clock size={14} color="var(--warning)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tone-warning-fg)' }}>Planned — Q3 2026</span>
      </div>

      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 32px', maxWidth: 580 }}>
        The REIN key broker lets your agent call external APIs (OpenAI, AWS, GitHub, Anthropic) without
        ever seeing the actual API key. REIN proxies the request, enforces your spending policy,
        and settles the cost on-chain.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
        {[
          { title: '2-of-3 Shamir secret sharing', body: 'API keys are split into three shares: one in your wallet, one in REIN\'s Cloudflare KV, one on your device. Two shares are required to reconstruct and use the key.' },
          { title: 'Agent never sees the key', body: 'rein.proxy(service, request) sends the API call through REIN\'s edge proxy. The key is assembled server-side, used once, and discarded. No key is ever returned to the agent.' },
          { title: 'Per-service cost estimator', body: 'For LLM APIs, REIN estimates the token cost before the call and checks your policy. If the estimate exceeds your per-tx cap, the call is blocked before any tokens are spent.' },
          { title: 'On-chain settlement', body: 'Proxied API costs are batched and settled on-chain via USDC. Your vault\'s spend history reflects every proxied call alongside native Solana payments.' },
        ].map(({ title, body }) => (
          <div key={title} style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/roadmap" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          View roadmap →
        </Link>
        <Link href="/docs/concepts/step-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          Step-up auth
        </Link>
      </div>
    </div>
  );
}
