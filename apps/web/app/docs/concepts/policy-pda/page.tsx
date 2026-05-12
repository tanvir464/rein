import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Policy PDA' };

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.85, overflowX: 'auto' }}>
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

export default function PolicyPDAPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>Concepts</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>Policy PDA</h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 32px', maxWidth: 580 }}>
        A Policy PDA (Program Derived Address) is an on-chain account on Solana that stores your
        vault's spending rules. It is owned by the REIN Anchor program — not by a server or database.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
        {[
          { title: 'Tamper-proof', body: 'Only the vault owner keypair can update the Policy PDA. A compromised REIN service cannot modify your rules.' },
          { title: 'Atomically enforced', body: 'Every rein_spend call reads the Policy PDA inside the same transaction. The rules are checked before any funds move.' },
          { title: 'Composable', body: 'Policy PDAs can be read by any Solana program. This enables future composition with Squads multisig and DAO treasuries.' },
        ].map(({ title, body }) => (
          <div key={title} style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Policy PDA structure</h2>
      <CodeBlock>
        <span style={{ color: '#ff7b72' }}>struct</span>{' '}<span style={{ color: '#79c0ff' }}>PolicyAccount</span>{' '}<span style={{ color: '#e6edf3' }}>{'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>owner: Pubkey,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>daily_cap_usdc: u64,        </span><span style={{ color: '#8b949e' }}>// in lamports × 10^6</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>per_tx_cap_usdc: u64,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>step_up_threshold_usdc: u64,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>allowlist_root: [u8; 32],    </span><span style={{ color: '#8b949e' }}>// Merkle root, zero = disabled</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>blocklist_root: [u8; 32],</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>expires_at: i64,             </span><span style={{ color: '#8b949e' }}>// Unix timestamp, 0 = never</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>paused: bool,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>daily_spent_usdc: u64,       </span><span style={{ color: '#8b949e' }}>// resets each UTC day</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>last_reset_day: i64,</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'}</span>
      </CodeBlock>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/concepts/receipt-pda" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          Receipt PDA →
        </Link>
        <Link href="/docs/api-reference/spend" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          rein_spend
        </Link>
      </div>
    </div>
  );
}
