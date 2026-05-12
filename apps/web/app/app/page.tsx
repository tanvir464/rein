'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Wallet, ArrowRight } from 'lucide-react';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { StatBlock } from '../../components/stat-block';
import { StatusBadge } from '../../components/status-badge';
import { MiniChart } from '../../components/mini-chart';
import { EmptyState } from '../../components/empty-state';
import { Skeleton } from '../../components/skeleton';
import { listVaults, listReceiptsForVaults, listStepUpsForVaults } from '../../lib/api';
import type { Receipt, StepUp, Vault } from '../../lib/types';
import { formatUsdc, truncate } from '../../lib/format';
import { useAuth } from '../../components/auth-provider';
import { NewVaultButton } from './new-vault-button';

export default function VaultsPage() {
  const { owner } = useAuth();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stepUps, setStepUps] = useState<StepUp[]>([]);
  const [loading, setLoading] = useState(true);

  // Owner-scoped polling. Worker translates `?owner=` into an Anchor memcmp
  // filter so we never list other devs' devnet vaults. 30s poll keeps the
  // dashboard in sync without thrashing the worker; switch wallet (sign-out
  // → sign-in) triggers an immediate refetch via the dep array.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!owner) {
        if (!cancelled) {
          setVaults([]);
          setReceipts([]);
          setStepUps([]);
          setLoading(false);
        }
        return;
      }
      const vs = await listVaults(owner);
      if (cancelled) return;
      const ids = vs.map((v) => v.id);
      const [rs, sus] = await Promise.all([
        ids.length ? listReceiptsForVaults(ids, 20) : Promise.resolve([] as Receipt[]),
        ids.length ? listStepUpsForVaults(ids) : Promise.resolve([] as StepUp[]),
      ]);
      if (cancelled) return;
      setVaults(vs);
      setReceipts(rs);
      setStepUps(sus);
      setLoading(false);
    };
    setLoading(true);
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [owner]);

  const totalBalance = vaults.reduce((s, v) => s + v.balanceUsdc, 0);
  const totalSpend24h = vaults.reduce((s, v) => s + v.spend24h, 0);
  const activeVaults = vaults.filter((v) => v.status === 'active').length;
  const pendingStepUps = stepUps.filter((s) => s.status === 'pending').length;

  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--container)' }}>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Vaults</h1>
          <p className="m-0 mt-1 text-[var(--muted)] text-sm">
            Active spending guardrails for every agent you operate.
          </p>
        </div>
        <NewVaultButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {loading ? (
          <>
            <StatBlockSkeleton />
            <StatBlockSkeleton />
            <StatBlockSkeleton />
            <StatBlockSkeleton />
          </>
        ) : (
          <>
            <StatBlock label="Total balance" prefix="$" value={formatUsdc(totalBalance * 1_000_000)} />
            <StatBlock label="24h spend" prefix="$" value={formatUsdc(totalSpend24h * 1_000_000)} />
            <StatBlock label="Active vaults" value={activeVaults} suffix={`/ ${vaults.length}`} />
            <StatBlock label="Pending step-ups" value={pendingStepUps} />
          </>
        )}
      </div>

      <h2 className="m-0 mb-4 text-[18px] font-semibold">Your vaults</h2>
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VaultCardSkeleton />
          <VaultCardSkeleton />
        </div>
      ) : vaults.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={owner ? 'No vault yet for this wallet' : 'Sign in to see your vaults'}
          body={
            owner
              ? 'Each Solana wallet maps 1:1 to a vault — initialize one from onboarding, or connect a different wallet (or create one in Phantom) to add another.'
              : 'Connect a wallet on the login page to see vaults bound to your owner pubkey.'
          }
          cta={
            <Link href={owner ? '/onboarding' : '/login'}>
              <Button>
                <Plus size={14} />
                {owner ? 'Create vault' : 'Sign in'}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {vaults.map((v) => {
            const utilization = v.cap24h > 0 ? Math.min(100, (v.spend24h / v.cap24h) * 100) : 0;
            const recentTx = receipts.filter((r) => r.vaultId === v.id).length;
            return (
              <Card key={v.id} interactive className="p-5 fade-in">
                <Link href={`/app/vaults/${v.id}`} className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'var(--accent-soft-bg)', color: 'var(--accent-soft-fg)' }}
                      >
                        <Wallet size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{v.name}</div>
                        <div className="font-mono text-[12px] text-[var(--muted)] truncate">{truncate(v.pubkey, 6, 6)}</div>
                      </div>
                    </div>
                    <StatusBadge dot tone={v.status === 'active' ? 'success' : v.status === 'paused' ? 'warning' : 'muted'}>
                      {v.status}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1">Balance</div>
                      <div className="tabular text-[22px] font-semibold leading-none">
                        <span className="text-[var(--muted)] mr-0.5 text-[14px]">$</span>
                        {formatUsdc(v.balanceUsdc * 1_000_000)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1">24h spend</div>
                      <div className="tabular text-[22px] font-semibold leading-none">
                        <span className="text-[var(--muted)] mr-0.5 text-[14px]">$</span>
                        {formatUsdc(v.spend24h * 1_000_000)}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <MiniChart data={v.spark} width={120} height={40} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[12px] text-[var(--muted)] mb-1.5">
                      <span>Daily cap</span>
                      <span className="tabular">${formatUsdc(v.spend24h * 1_000_000)} / ${formatUsdc(v.cap24h * 1_000_000)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--gray-200)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${utilization}%`,
                          backgroundColor: utilization > 80 ? 'var(--warning)' : 'var(--accent-700)',
                          transition: 'width var(--dur-slow) var(--ease-glide)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-[var(--muted)]">
                    <span>v{v.policyVersion} policy · {recentTx} recent txns</span>
                    <span className="inline-flex items-center gap-1 text-[var(--accent-700)]">
                      Open <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Loading skeletons ───────────────────────────────────────────────────
// Mirror the real layout so the page doesn't reflow when data lands.

function StatBlockSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function VaultCardSkeleton() {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton className="rounded-[10px]" style={{ width: 38, height: 38 }} />
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
      </div>
      <div className="grid grid-cols-3 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex justify-end">
          <Skeleton style={{ width: 120, height: 40 }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-12" />
      </div>
    </Card>
  );
}
