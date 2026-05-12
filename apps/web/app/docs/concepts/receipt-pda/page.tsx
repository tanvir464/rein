import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Receipt PDA' };

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.85, overflowX: 'auto' }}>
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

export default function ReceiptPDAPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>Concepts</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>Receipt PDA</h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 32px', maxWidth: 580 }}>
        A Receipt PDA is created atomically inside every successful <code style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>rein_spend</code> transaction.
        It is permanent, immutable, and verifiable by any third party using only the Solana tx signature.
      </p>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Receipt PDA structure</h2>
      <CodeBlock>
        <span style={{ color: '#ff7b72' }}>struct</span>{' '}<span style={{ color: '#79c0ff' }}>ReceiptAccount</span>{' '}<span style={{ color: '#e6edf3' }}>{'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>vault: Pubkey,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>recipient_hash: [u8; 32],  </span><span style={{ color: '#8b949e' }}>// SHA-256 of recipient URL</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>amount_usdc: u64,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>timestamp: i64,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>memo: String,              </span><span style={{ color: '#8b949e' }}>// max 100 chars</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>refunded: bool,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>dispute_id: Option</span><span style={{ color: '#79c0ff' }}>{'<Pubkey>'}</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'}</span>
      </CodeBlock>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
        {[
          { title: 'Atomic creation', body: 'The Receipt PDA is created in the same transaction as the payment. There is no window where a payment can succeed without a receipt.' },
          { title: 'Immutable', body: 'Once created, the core fields (vault, recipient_hash, amount, timestamp) cannot be changed. Only refunded and dispute_id are mutable.' },
          { title: 'Disputable', body: "Calling rein_dispute marks the receipt and initiates a refund review. The vault owner's dashboard surfaces all disputed receipts." },
          { title: 'Privacy-preserving', body: 'The full recipient URL is never stored on-chain — only its SHA-256 hash. You can verify a specific recipient by hashing the URL locally.' },
        ].map(({ title, body }) => (
          <div key={title} style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/concepts/step-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          Step-up auth →
        </Link>
        <Link href="/docs/concepts/policy-pda" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          Policy PDA
        </Link>
      </div>
    </div>
  );
}
