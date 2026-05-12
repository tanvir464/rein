import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Step-up Auth' };

export default function StepUpConceptPage() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-700)' }}>Concepts</span>
      </div>
      <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>Step-up Auth</h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 580 }}>
        Step-up auth pauses any spend above your configured threshold and sends you a push notification.
        Your agent waits up to 5 minutes for your approval before proceeding or cancelling.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
        {[
          { n: '01', title: 'Agent hits the threshold', body: 'Your agent requests $47 — above your $10 step-up threshold. The Anchor program creates a StepUpRequest PDA and returns step_up_required.' },
          { n: '02', title: 'Push notification fires', body: 'REIN sends a notification via Telegram, web push, email (Resend), or mobile push. The message shows recipient, amount, and the agent memo.' },
          { n: '03', title: 'You approve or deny', body: 'Tap Approve in the REIN dashboard (or mobile app in Q4 2026). An on-chain approval transaction is signed by your wallet and verified by the program.' },
          { n: '04', title: 'Agent resumes in under 1 second', body: 'On approval, the pending spend retries and executes. On denial or 5-minute timeout, the spend is cancelled and the agent receives a typed error.' },
        ].map(({ n, title, body }) => (
          <div key={n} style={{ display: 'flex', gap: 16, padding: '18px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{n}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 5 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
        <Link href="/docs/api-reference/step-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
          request_step_up API →
        </Link>
        <Link href="/docs/concepts/receipt-pda" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 9999, border: '1px solid var(--border)', color: 'var(--fg)', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>
          Receipt PDA
        </Link>
      </div>
    </div>
  );
}
