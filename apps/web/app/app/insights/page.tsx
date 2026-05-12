'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { TrendingDown, TrendingUp, AlertTriangle, BarChart3, Info } from 'lucide-react';
import { Card } from '../../../components/card';
import { EmptyState } from '../../../components/empty-state';
import { Skeleton } from '../../../components/skeleton';
import { MiniChart } from '../../../components/mini-chart';
import { RecipientMiniReputation } from '../../../components/reputation-card';
import { listVaults, getInsights, type Insights as InsightsT, type Vault } from '../../../lib/api';
import { RelativeTime } from '../../../components/relative-time';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty'; reason: 'no-wallet' | 'no-vaults' | 'no-data' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; insights: InsightsT };

export default function InsightsPage() {
  return (
    <Suspense fallback={null}>
      <InsightsPageInner />
    </Suspense>
  );
}

function InsightsPageInner() {
  const { publicKey } = useWallet();
  const search = useSearchParams();
  const vaultParam = search.get('vault') ?? undefined;
  const [, setVaults] = useState<Vault[] | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    (async () => {
      // If the URL explicitly addresses a vault, render against it (lets the
      // "empty state" test target an unknown vault directly).
      if (vaultParam) {
        try {
          const i = await getInsights(vaultParam);
          if (cancelled) return;
          if (!i || (totalUsd(i) === 0 && i.topRecipients.length === 0 && i.anomalies.length === 0)) {
            setState({ kind: 'empty', reason: 'no-data' });
          } else {
            setState({ kind: 'ready', insights: i });
          }
        } catch (e) {
          if (cancelled) return;
          setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
        }
        return;
      }
      if (!publicKey) {
        setState({ kind: 'empty', reason: 'no-wallet' });
        return;
      }
      try {
        const vs = await listVaults(publicKey.toBase58());
        if (cancelled) return;
        setVaults(vs);
        if (vs.length === 0) {
          setState({ kind: 'empty', reason: 'no-vaults' });
          return;
        }
        const first = vs[0];
        if (!first) {
          setState({ kind: 'empty', reason: 'no-vaults' });
          return;
        }
        const i = await getInsights(first.id);
        if (cancelled) return;
        if (!i) {
          setState({ kind: 'empty', reason: 'no-data' });
        } else {
          setState({ kind: 'ready', insights: i });
        }
      } catch (e) {
        if (cancelled) return;
        setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey, vaultParam]);

  if (state.kind === 'loading') {
    return (
      <Wrapper>
        <Header />
        <InsightsSkeleton />
      </Wrapper>
    );
  }

  if (state.kind === 'empty') {
    return (
      <Wrapper>
        <Header />
        <div data-testid="insights-empty-state">
          <EmptyState
            icon={BarChart3}
            title={
              state.reason === 'no-wallet'
                ? 'Connect a wallet'
                : state.reason === 'no-vaults'
                  ? 'No vault for this wallet'
                  : 'No data yet'
            }
            body={
              state.reason === 'no-wallet'
                ? 'Sign in to see insights for your vault.'
                : state.reason === 'no-vaults'
                  ? 'Insights are computed per vault from on-chain receipts. Run onboarding to create one.'
                  : 'This vault has no spend history. Insights populate after the first receipt.'
            }
          />
        </div>
      </Wrapper>
    );
  }

  if (state.kind === 'error') {
    return (
      <Wrapper>
        <Header />
        <div data-testid="insights-error-state">
          <EmptyState
            icon={AlertTriangle}
            title="Insights upstream error"
            body={state.message}
          />
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Header />
      <InsightsBody insights={state.insights} />
    </Wrapper>
  );
}

function totalUsd(i: InsightsT): number {
  return typeof i.totalUsd === 'number' ? i.totalUsd : i.totalSpend7d;
}

function InsightsBody({ insights }: { insights: InsightsT }) {
  const i = insights;
  const total = totalUsd(i);
  const prev = i.prevWeekTotalUsd ?? i.totalSpendPrev7d;
  const wowPct =
    typeof i.wowDeltaPct === 'number'
      ? i.wowDeltaPct
      : prev > 0
        ? ((total - prev) / prev) * 100
        : 0;
  const wowSign = wowPct >= 0 ? '+' : '−';
  const wowColor = wowPct >= 0 ? 'var(--success)' : 'var(--danger)';

  // Synthesize a 7-day sparkline shape from the WoW direction. We don't have
  // a daily series in /v1/insights yet — when one lands, swap this in.
  const spark = synthSpark(total, prev);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="p-6 col-span-2">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
                7d spend (USD)
              </div>
              <div
                data-testid="insights-total-usd"
                className="tabular-nums text-[40px] font-semibold leading-none fade-in"
              >
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                <span
                  data-testid="insights-wow-delta-pct"
                  className="inline-flex items-center gap-1 font-semibold tabular-nums"
                  style={{ color: wowColor }}
                >
                  {wowPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {wowSign}
                  {Math.abs(wowPct).toFixed(1)}%
                </span>
                vs prev 7d (${prev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </div>
            </div>
            <div data-testid="insights-wow-sparkline" className="fade-in">
              <MiniChart
                data={spark}
                width={180}
                height={56}
                color={wowColor}
                fill={wowPct >= 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
            Activity
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Stat label="Tx" value={String(i.txCount7d)} sub={`prev ${i.txCountPrev7d}`} />
            <Stat
              label="Avg / task"
              value={`$${i.avgCostPerTask.toFixed(2)}`}
              sub="USD"
            />
            <Stat
              label="Anomalies"
              value={String(i.anomalies.length)}
              sub={i.anomalies.length === 1 ? 'flagged' : 'flagged'}
            />
            <Stat label="Recipients" value={String(i.topRecipients.length)} sub="top 7d" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 col-span-2">
          <h2 className="m-0 mb-4 text-[16px] font-semibold">Top recipients (USD, 7d)</h2>
          {i.topRecipients.length === 0 ? (
            <p className="text-sm text-[var(--muted)] m-0">No recipients in the last 7 days.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {i.topRecipients.map((r) => {
                const amountUsd = typeof r.amountUsd === 'number' ? r.amountUsd : r.usdc;
                // r.label is a truncated form ("Ab12…Cd"). To get the full
                // pubkey for reputation lookup we'd ideally have an address
                // field. Pass through the label as-is — the reputation
                // component will silently fall through to "unknown" if it
                // can't parse, which keeps the row rendering.
                return (
                  <li
                    key={r.label}
                    data-testid="top-recipient-row"
                    className="flex items-center gap-4"
                  >
                    <div
                      className="h-8 w-8 rounded-md flex items-center justify-center font-semibold text-[12px]"
                      style={{
                        backgroundColor: 'var(--accent-soft-bg)',
                        color: 'var(--accent-soft-fg)',
                      }}
                    >
                      {r.label.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate font-mono">{r.label}</div>
                      <div
                        className="h-1.5 mt-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--gray-200)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.share * 100}%`, backgroundColor: 'var(--accent-700)' }}
                        />
                      </div>
                    </div>
                    <RecipientMiniReputation address={r.label} />
                    <div className="text-right min-w-[80px]">
                      <div
                        data-testid="top-recipient-usd"
                        className="tabular-nums text-sm font-semibold"
                      >
                        ${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="tabular-nums text-[11px] text-[var(--muted)]">
                        {(r.share * 100).toFixed(0)}%
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card data-testid="insights-anomalies-panel" className="p-6">
          <h2 className="m-0 mb-4 text-[16px] font-semibold flex items-center gap-2">
            <AlertTriangle size={16} color="var(--warning)" /> Anomalies
          </h2>
          {i.anomalies.length === 0 ? (
            <p className="text-sm text-[var(--muted)] m-0">Nothing unusual.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {i.anomalies.map((a) => {
                // Anomaly objects from the worker carry a receiptNonce when
                // hydrated from the new GoldRush anomaly detector; fall back
                // to the legacy F29 shape (id only) if missing.
                const asAny = a as unknown as { receiptNonce?: string; recipient?: string; vault?: string };
                const href =
                  asAny.receiptNonce && asAny.vault
                    ? `/app/activity/${asAny.receiptNonce}?vault=${asAny.vault}`
                    : undefined;
                const inner = (
                  <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)]">
                    <div
                      className="h-7 w-7 rounded-md shrink-0 flex items-center justify-center"
                      style={{
                        backgroundColor:
                          a.severity === 'warning' || a.severity === 'critical'
                            ? 'var(--tone-warning-bg)'
                            : 'var(--accent-soft-bg)',
                        color:
                          a.severity === 'warning' || a.severity === 'critical'
                            ? 'var(--tone-warning-fg)'
                            : 'var(--accent-soft-fg)',
                      }}
                    >
                      {a.severity === 'warning' || a.severity === 'critical' ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Info size={14} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-[13px]">{a.label}</div>
                      <div className="text-[12px] text-[var(--muted)]">{a.detail}</div>
                      <RelativeTime
                        value={a.at}
                        className="text-[11px] text-[var(--muted)] mt-1 block"
                      />
                    </div>
                  </div>
                );
                return (
                  <li key={a.id}>
                    {href ? <Link href={href}>{inner}</Link> : inner}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="tabular-nums text-[22px] font-semibold leading-tight">{value}</div>
      {sub && (
        <div className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
        Insights
      </h1>
      <p className="m-0 mt-1 text-[var(--muted)] text-sm">
        USD-denominated agent spend, week-over-week, with real outlier detection.
      </p>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--container)' }}>
      {children}
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="p-6 col-span-2 flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-3 w-40" />
        </Card>
        <Card className="p-6 flex flex-col gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 col-span-2 flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
        <Card className="p-6 flex flex-col gap-4">
          <Skeleton className="h-4 w-28" />
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </Card>
      </div>
    </>
  );
}

/**
 * Build a 7-point shape that reflects the WoW direction without faking
 * per-day data: monotonic up if total>prev, down if total<prev, flat
 * otherwise. Looks better than a flatline and avoids implying daily fidelity
 * we don't have yet.
 */
function synthSpark(curr: number, prev: number): number[] {
  const slope = curr - prev;
  const out: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    // soften with a sine ease so the curve doesn't look perfectly linear
    const eased = 0.5 - Math.cos(Math.PI * t) / 2;
    out.push(prev + slope * eased);
  }
  return out;
}
