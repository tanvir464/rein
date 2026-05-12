import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'request_step_up' };

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, padding: '20px 24px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.85, overflowX: 'auto' }}>
      <div style={{ color: '#e6edf3' }}>{children}</div>
    </div>
  );
}

function ParamRow({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 0, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 160, flexShrink: 0 }}>
        <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{name}</code>
        {required && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase' }}>required</span>}
      </div>
      <div style={{ width: 120, flexShrink: 0 }}><code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-700)', background: 'var(--accent-100)', padding: '2px 7px', borderRadius: 5 }}>{type}</code></div>
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export default function StepUpApiPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>API reference</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.1 }}>request_step_up</h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--muted)', margin: '0 0 32px', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10 }}>
        request_step_up(reason, amount_usdc)
      </div>
      <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        Explicitly request human approval before proceeding. Creates a StepUpRequest PDA on-chain and sends a push notification to the vault owner. The agent should await approval before retrying the spend.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Parameters</h2>
      <div style={{ marginBottom: 40 }}>
        <ParamRow name="reason" type="string" required desc="Human-readable description of why approval is needed. Shown in the push notification." />
        <ParamRow name="amount_usdc" type="number" required desc="The amount the agent intends to spend once approved." />
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>Example</h2>
      <CodeBlock>
        <span style={{ color: '#8b949e' }}>// Agent wants to spend above the step-up threshold</span>{'\n'}
        <span style={{ color: '#ff7b72' }}>const</span>{' '}<span style={{ color: '#79c0ff' }}>approval</span>{' '}<span style={{ color: '#e6edf3' }}>= </span><span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span><span style={{ color: '#e6edf3' }}>.requestStepUp({'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>reason: </span><span style={{ color: '#a5d6ff' }}>'Booking a flight for the research task'</span><span style={{ color: '#e6edf3' }}>,</span>{'\n'}
        {'  '}<span style={{ color: '#e6edf3' }}>amount_usdc: </span><span style={{ color: '#79c0ff' }}>47.00</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'});</span>{'\n\n'}
        <span style={{ color: '#ff7b72' }}>if</span>{' '}<span style={{ color: '#e6edf3' }}>(approval.status === </span><span style={{ color: '#a5d6ff' }}>'approved'</span><span style={{ color: '#e6edf3' }}>) {'{'}</span>{'\n'}
        {'  '}<span style={{ color: '#ff7b72' }}>await</span>{' '}<span style={{ color: '#79c0ff' }}>rein</span><span style={{ color: '#e6edf3' }}>.spend({'{ recipient: "expedia.com", amount_usdc: 47.00 }'});</span>{'\n'}
        <span style={{ color: '#e6edf3' }}>{'}'}</span>
      </CodeBlock>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/concepts/step-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          Step-up concept →
        </Link>
        <Link href="/docs/api-reference/spend" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          rein_spend
        </Link>
      </div>
    </div>
  );
}
