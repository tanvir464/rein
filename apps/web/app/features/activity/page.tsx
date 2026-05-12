import Link from 'next/link';
import { ArrowRight, Activity, Download, Ban, Search } from 'lucide-react';
import { LandingNav } from '../../../components/landing-nav';

export const metadata = { title: 'Activity Feed — REIN', description: 'Real-time on-chain receipts for every agent payment. Filter, search, export, and dispute any transaction.' };

export default function ActivityPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <LandingNav />
      <section style={{ padding: '96px 24px 80px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--accent-100)', marginBottom: 20 }}>
            <Activity size={24} color="var(--accent-700)" />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-700)', margin: '0 0 14px' }}>Live activity feed</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 20px' }}>
            Every spend.<br />Visible. Refundable.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Real-time WebSocket receipts appear the moment your agent pays. Every transaction is permanently logged on Solana — exportable, auditable, and disputable in one click.
          </p>
          <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Open your dashboard <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 40px' }}>Built for auditability</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { icon: Activity, title: 'Real-time WebSocket', desc: 'Receipts appear in your dashboard within 1 second of the Solana transaction confirming — no polling, no refresh.' },
            { icon: Search, title: 'Filter & search', desc: 'Filter by recipient, date range, amount, or runtime. Full-text search across memos and recipient URLs.' },
            { icon: Download, title: 'Export CSV / JSON', desc: 'Export the full receipt history for your vault. Use it for tax reporting, team audits, or feeding into your own analytics.' },
            { icon: Ban, title: 'Dispute & blocklist', desc: 'One click adds a recipient to your vault\'s permanent blocklist. Future spends to that domain are rejected on-chain.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ padding: '24px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={18} color="var(--accent-700)" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px' }}>On-chain means court-defensible</h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 28px' }}>
            Every Receipt PDA contains: vault address, recipient hash, URL hash, amount, timestamp, success flag, dispute status, and the Solana tx signature. Any third party can verify it without touching your wallet.
          </p>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', lineHeight: 1.9 }}>
            {[
              ['vault:', ' "2QFW...wNj"'],
              ['recipient_hash:', ' "a7f3...c2b"'],
              ['amount_usdc:', ' 0.02'],
              ['ts:', ' 1746611134'],
              ['tx_signature:', ' "3vQW...aBc"'],
              ['refunded:', ' false'],
              ['dispute_id:', ' null'],
            ].map(([k, v]) => (
              <div key={k as string}>
                <span style={{ color: 'var(--accent-700)' }}>{k as string}</span>
                <span style={{ color: 'var(--muted)' }}>{v as string}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 12px' }}>See your agent spending in real time.</h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 28px' }}>Connect your vault and watch receipts appear as your agent works.</p>
        <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Get started free <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
