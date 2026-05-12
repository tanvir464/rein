import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'rein_balance' };

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.85, overflowX: 'auto' }}>
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

function ParamRow({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 0, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 160, flexShrink: 0 }}><code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{name}</code></div>
      <div style={{ width: 120, flexShrink: 0 }}><code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-700)', background: 'var(--accent-100)', padding: '2px 7px', borderRadius: 5 }}>{type}</code></div>
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export default function BalancePage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>API reference</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>rein_balance</h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--muted)', margin: '0 0 32px', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10 }}>
        rein_balance()
      </div>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        Returns the current vault balance, daily spend total, and remaining daily cap. No parameters required.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Returns</h2>
      <div style={{ marginBottom: 40 }}>
        <ParamRow name="balance_usdc" type="number" desc="Current USDC balance in the vault." />
        <ParamRow name="daily_spent_usdc" type="number" desc="Total USDC spent today (UTC day)." />
        <ParamRow name="daily_remaining_usdc" type="number" desc="Remaining daily cap. Equals daily_cap_usdc minus daily_spent_usdc." />
        <ParamRow name="daily_cap_usdc" type="number" desc="Your configured daily cap from the Policy PDA." />
        <ParamRow name="vault" type="string" desc="The vault address this balance belongs to." />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Example</h2>
      <CodeBlock>
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>balance</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span><span style={{ color: '#e6edf3' }}>.balance();</span>{'\n\n'}
        <span style={{ color: '#e6edf3' }}>console.log(</span><span style={{ color: '#a5d6ff' }}>`Vault: $</span><span style={{ color: '#79c0ff' }}>${'{balance.balance_usdc}'}</span><span style={{ color: '#a5d6ff' }}> USDC`</span><span style={{ color: '#e6edf3' }}>);</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>console.log(</span><span style={{ color: '#a5d6ff' }}>`Daily: $</span><span style={{ color: '#79c0ff' }}>${'{balance.daily_spent_usdc}'}</span><span style={{ color: '#a5d6ff' }}> / $</span><span style={{ color: '#79c0ff' }}>${'{balance.daily_cap_usdc}'}</span><span style={{ color: '#a5d6ff' }}>`</span><span style={{ color: '#e6edf3' }}>);</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>console.log(</span><span style={{ color: '#a5d6ff' }}>`Remaining: $</span><span style={{ color: '#79c0ff' }}>${'{balance.daily_remaining_usdc}'}</span><span style={{ color: '#a5d6ff' }}>`</span><span style={{ color: '#e6edf3' }}>);</span>
      </CodeBlock>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/api-reference/history" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          rein_history →
        </Link>
        <Link href="/docs/api-reference/spend" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          rein_spend
        </Link>
      </div>
    </div>
  );
}
