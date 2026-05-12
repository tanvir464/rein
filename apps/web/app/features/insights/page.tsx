import Link from 'next/link';
import { ArrowRight, BarChart3, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { LandingNav } from '../../../components/landing-nav';

export const metadata = { title: 'Spend Insights — REIN', description: 'Per-recipient analytics, cost-per-task, anomaly flags, and week-over-week trends — all from your on-chain receipts.' };

export default function InsightsPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <LandingNav />
      <section style={{ padding: '96px 24px 80px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--accent-100)', marginBottom: 20 }}>
            <BarChart3 size={24} color="var(--accent-700)" />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-700)', margin: '0 0 14px' }}>Spend analytics</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 20px' }}>
            Know exactly what<br />your agent costs.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Per-recipient breakdowns, cost-per-task calculations, week-over-week trends, and anomaly flags — all derived from your on-chain receipts. No third-party tracking. The data is yours, permanently.
          </p>
          <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            View your insights <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 40px' }}>What you can measure</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            { icon: DollarSign, title: 'Top recipients by spend', desc: 'See where every dollar goes — grouped by domain, with USDC totals and transaction counts for any date range.' },
            { icon: BarChart3, title: 'Cost per task', desc: 'Map spend to agent tasks. If your agent runs 100 research cycles, REIN shows you the median USDC cost per cycle.' },
            { icon: TrendingUp, title: 'Week-over-week trends', desc: 'Compare spend across time periods. Spot if a recipient\'s costs are creeping up or a new API is being called unexpectedly.' },
            { icon: AlertTriangle, title: 'Anomaly flags', desc: 'REIN surfaces outliers: spends that are 2× the median for a recipient, unusual time-of-day patterns, or recipients never seen before.' },
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

      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Your agent's ROI, in numbers.</h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 28px' }}>Every on-chain receipt feeds your insights automatically. No configuration needed.</p>
        <Link href="/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 20px', borderRadius: 9999, background: 'var(--accent-700)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Get started free <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
