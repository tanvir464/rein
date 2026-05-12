import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'rein_history' };

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

export default function HistoryPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>API reference</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>rein_history</h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--muted)', margin: '0 0 32px', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10 }}>
        rein_history(limit?, offset?)
      </div>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        Returns a paginated list of Receipt PDAs for your vault — each containing the full on-chain spend record. Useful for cost-per-task reporting and audit exports.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Parameters</h2>
      <div style={{ marginBottom: 40 }}>
        <ParamRow name="limit" type="number" desc="Maximum receipts to return. Defaults to 20. Max 100." />
        <ParamRow name="offset" type="number" desc="Number of receipts to skip for pagination. Defaults to 0." />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Returns</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px' }}>Array of <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>SpendReceipt</code> objects, newest first. See <Link href="/docs/api-reference/spend" style={{ color: 'var(--accent-700)' }}>rein_spend</Link> for the full receipt shape.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Example</h2>
      <CodeBlock>
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>receipts</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span><span style={{ color: '#e6edf3' }}>.history({'{ limit: 10 }'});</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>for</span>{' '}<span style={{ color: '#e6edf3' }}>(</span><span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>r</span>{' '}<span style={{ color: '#ff7b72' }}>of</span>{' '}<span style={{ color: '#79c0ff' }}>receipts</span><span style={{ color: '#e6edf3' }}>) {'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>console.log(r.amount_usdc, r.recipient_hash, r.timestamp);</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'}</span>
      </CodeBlock>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/api-reference/step-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          request_step_up →
        </Link>
        <Link href="/docs/api-reference/balance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          rein_balance
        </Link>
      </div>
    </div>
  );
}
