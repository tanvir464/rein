import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'rein_spend' };

function CodeBlock({ children, lang }: { children: React.ReactNode; lang?: string }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.85, overflowX: 'auto', position: 'relative' }}>
      {lang && <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 11, color: '#8b949e', fontFamily: 'var(--font-sans)' }}>{lang}</div>}
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

function ParamRow({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 0, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 160, flexShrink: 0 }}>
        <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{name}</code>
        {required && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>required</span>}
      </div>
      <div style={{ width: 120, flexShrink: 0 }}>
        <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-700)', background: 'var(--accent-100)', padding: '2px 7px', borderRadius: 5 }}>{type}</code>
      </div>
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export default function SpendPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>
          API reference
        </span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>
        rein_spend
      </h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--muted)', margin: '0 0 32px', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10 }}>
        rein_spend(recipient, amount_usdc, memo?)
      </div>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        Submit a USDC payment from your vault. The Anchor program validates all active policy rules
        atomically. On success, a Receipt PDA is created in the same transaction. On failure, the
        transaction reverts with a typed error.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Parameters</h2>
      <div style={{ marginBottom: 40 }}>
        <ParamRow name="recipient" type="string" required desc="Domain or URL of the payment recipient. Must match an entry in your allowlist if allowlist is configured. Example: 'api.brave.com'" />
        <ParamRow name="amount_usdc" type="number" required desc="Amount in USDC to transfer. Must be ≤ per_tx_cap_usdc and not push daily total above daily_cap_usdc." />
        <ParamRow name="memo" type="string" desc="Optional description stored in the Receipt PDA. Useful for cost-per-task analytics. Max 100 chars." />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Returns</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
        A <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>SpendReceipt</code> object:
      </p>
      <CodeBlock lang="typescript">
        <span style={{ color: '#ff7b72' }}>interface</span>{' '}<span style={{ color: '#79c0ff' }}>SpendReceipt</span>{' '}<span style={{ color: '#e6edf3' }}>{'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>signature</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>string</span><span style={{ color: '#e6edf3' }}>;</span>{' '}<span style={{ color: '#8b949e' }}>// Solana transaction signature</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>receipt_pda</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>string</span><span style={{ color: '#e6edf3' }}>;</span>{' '}<span style={{ color: '#8b949e' }}>// On-chain Receipt PDA address</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>vault</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>string</span><span style={{ color: '#e6edf3' }}>;</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>recipient_hash</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>string</span><span style={{ color: '#e6edf3' }}>;</span>{' '}<span style={{ color: '#8b949e' }}>// SHA-256 of recipient domain</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>amount_usdc</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>number</span><span style={{ color: '#e6edf3' }}>;</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>timestamp</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>number</span><span style={{ color: '#e6edf3' }}>;</span>{' '}<span style={{ color: '#8b949e' }}>// Unix timestamp (on-chain)</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>refunded</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>boolean</span><span style={{ color: '#e6edf3' }}>;</span>{'\n'}
        {'  '}<span style={{ color: '#d2a8ff' }}>dispute_id</span><span style={{ color: '#e6edf3' }}>: </span><span style={{ color: '#79c0ff' }}>string</span>{' '}<span style={{ color: '#ff7b72' }}>| </span><span style={{ color: '#79c0ff' }}>null</span><span style={{ color: '#e6edf3' }}>;</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'}</span>
      </CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Errors</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
        {[
          { error: 'PolicyViolationError', cases: 'daily_cap_exceeded · per_tx_cap_exceeded · not_on_allowlist · on_blocklist · policy_paused · policy_expired' },
          { error: 'StepUpRequiredError', cases: 'amount_usdc > step_up_threshold. Agent must wait for owner approval via request_step_up or reduce the amount.' },
          { error: 'InsufficientBalanceError', cases: 'Vault does not have enough USDC to cover the spend.' },
        ].map(({ error, cases }) => (
          <div key={error} style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)', marginBottom: 4 }}>{error}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{cases}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Example</h2>
      <CodeBlock lang="typescript">
        <span style={{ color: '#ff7b72' }}>try</span>{' '}<span style={{ color: '#e6edf3' }}>{'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>receipt</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span><span style={{ color: '#e6edf3' }}>.spend({'{'}</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>recipient: </span><span style={{ color: '#a5d6ff' }}>'api.perplexity.ai'</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>amount_usdc: </span><span style={{ color: '#79c0ff' }}>0.05</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>memo: </span><span style={{ color: '#a5d6ff' }}>'perplexity search — market research task'</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>{'}'});</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>console.log(</span><span style={{ color: '#a5d6ff' }}>'Paid:'</span><span style={{ color: '#e6edf3' }}>, receipt.signature);</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'} </span><span style={{ color: '#ff7b72' }}>catch</span>{' '}<span style={{ color: '#e6edf3' }}>(err) {'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#ff7b72' }}>if</span>{' '}<span style={{ color: '#e6edf3' }}>(err </span><span style={{ color: '#ff7b72' }}>instanceof</span>{' '}<span style={{ color: '#79c0ff' }}>PolicyViolationError</span><span style={{ color: '#e6edf3' }}>) {'{'}</span>{'\n'}
        {'    '}<span style={{ color: '#e6edf3' }}>console.log(</span><span style={{ color: '#a5d6ff' }}>'Blocked:'</span><span style={{ color: '#e6edf3' }}>, err.rule, err.message);</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>{'}'}</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'}</span>
      </CodeBlock>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/api-reference/balance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          rein_balance →
        </Link>
        <Link href="/docs/api-reference/history" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          rein_history
        </Link>
      </div>
    </div>
  );
}
