import Link from 'next/link';
import { ArrowRight, Bell, Clock, Fingerprint, ShieldCheck } from 'lucide-react';
import { LandingNav } from '../../../components/landing-nav';

export const metadata = { title: 'Step-up Auth — REIN', description: 'High-value agent transactions pause and require your live approval. Push notification, biometric confirm, one tap.' };

export default function StepUpPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <LandingNav />
      <section style={{ padding: '96px 24px 80px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--accent-100)', marginBottom: 20 }}>
            <Bell size={24} color="var(--accent-700)" />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-700)', margin: '0 0 14px' }}>Step-up auth</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 20px' }}>
            Big transactions<br />pause for you.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Set a step-up threshold. Any payment above it triggers a push notification — your agent pauses, waits up to 5 minutes for your approval, then executes or cancels. You never lose control of large decisions.
          </p>
          <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Set up step-up <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 40px' }}>How the flow works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { icon: Bell, n: '01', title: 'Agent hits your threshold', body: 'Your agent requests $47 — above your $10 step-up threshold. The Anchor program creates a StepUpRequest PDA and returns step_up_required to the agent.' },
            { icon: Bell, n: '02', title: 'You get a push', body: 'REIN fans out a notification via Telegram, web push, email (Resend), or mobile push. The message shows recipient, amount, and context from the agent.' },
            { icon: Fingerprint, n: '03', title: 'Approve with biometric', body: 'Open REIN on your phone. One tap + Face ID / fingerprint sends an on-chain approval transaction — signed by your wallet, verified by the program.' },
            { icon: ShieldCheck, n: '04', title: 'Agent resumes instantly', body: 'Within 1 second of your approval, the agent\'s pending spend retries and executes. If you deny or the 5-minute TTL expires, the spend is cancelled and the agent is told.' },
          ].map(({ icon: Icon, n, title, body }) => (
            <div key={n} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '24px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{n}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px' }}>Notification channels</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { ch: 'Telegram', status: 'Live' },
              { ch: 'Web push', status: 'Live' },
              { ch: 'Email (Resend)', status: 'Live' },
              { ch: 'Mobile push', status: 'Roadmap' },
              { ch: 'Slack webhook', status: 'Roadmap' },
            ].map(({ ch, status }) => (
              <div key={ch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{ch}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: status === 'Live' ? 'var(--success)' : 'var(--muted)', background: status === 'Live' ? 'var(--tone-success-bg)' : 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 999 }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Never miss a large agent spend.</h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 28px' }}>Set your threshold once — REIN handles the rest.</p>
        <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Get started <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
