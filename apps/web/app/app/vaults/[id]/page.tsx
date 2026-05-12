import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../../../../components/button';
import { Card } from '../../../../components/card';
import { StatBlock } from '../../../../components/stat-block';
import { StatusBadge } from '../../../../components/status-badge';
import { MiniChart } from '../../../../components/mini-chart';
import { listVaults, getPolicy, listReceipts, getConfig } from '../../../../lib/api';
import { formatUsdc, truncate } from '../../../../lib/format';
import { RelativeTime } from '../../../../components/relative-time';
import { VaultActions } from './vault-actions';

export const dynamic = 'force-dynamic';

export default async function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vaults, policy, receipts, config] = await Promise.all([
    listVaults(),
    getPolicy(id),
    listReceipts(id, 5),
    getConfig(),
  ]);
  const vault = vaults.find((v) => v.id === id);
  if (!vault) notFound();
  const cluster = config?.cluster ?? 'devnet';

  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--container)' }}>
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] mb-4">
        <ArrowLeft size={14} /> All vaults
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>{vault.name}</h1>
            <StatusBadge dot tone={vault.status === 'active' ? 'success' : vault.status === 'paused' ? 'warning' : 'muted'}>
              {vault.status}
            </StatusBadge>
          </div>
          <div className="font-mono text-[13px] text-[var(--muted)] flex items-center gap-2">
            {truncate(vault.pubkey, 8, 8)}
            <a
              href={`https://explorer.solana.com/address/${vault.pubkey}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--fg)] inline-flex items-center gap-1"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/app/policy?vault=${vault.id}`}><Button><ShieldCheck size={14} />Edit policy</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <StatBlock label="Balance" prefix="$" value={formatUsdc(vault.balanceUsdc * 1_000_000)} />
        <StatBlock label="24h spend" prefix="$" value={formatUsdc(vault.spend24h * 1_000_000)} />
        <StatBlock label="Daily cap" prefix="$" value={formatUsdc(vault.cap24h * 1_000_000)} />
        <StatBlock label="Policy version" value={`v${vault.policyVersion}`} />
      </div>

      <VaultActions vault={vault.id} status={vault.status} cluster={cluster} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <Card className="p-6 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="m-0 text-[15px] font-semibold">Spend trend (24h)</h3>
            <span className="text-[12px] text-[var(--muted)]">USDC per hour</span>
          </div>
          {vault.spark.length > 0 ? (
            <MiniChart data={vault.spark} width={620} height={120} />
          ) : (
            <p className="text-sm text-[var(--muted)] m-0">Trend data not available yet.</p>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="m-0 text-[15px] font-semibold mb-4">Active rules</h3>
          {policy ? (
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <Rule label="Daily cap" value={`$${policy.dailyCapUsdc}`} />
              <Rule label="Per-tx cap" value={`$${policy.perTxCapUsdc}`} />
              <Rule label="Step-up over" value={`$${policy.stepUpThresholdUsdc}`} />
              <Rule label="Allowlist" value={`${policy.allowlist.length} addrs`} />
              <Rule label="Blocklist" value={`${policy.blocklist.length} addrs`} />
              {policy.expiresAt && <Rule label="Expires" value={new Date(policy.expiresAt).toLocaleDateString()} />}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)] m-0">No policy set.</p>
          )}
        </Card>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-[18px] font-semibold">Recent activity</h3>
        <Link href="/app/activity" className="text-[13px] text-[var(--accent-700)] hover:underline">
          View all
        </Link>
      </div>
      <Card className="overflow-hidden">
        {receipts.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)] m-0">No receipts yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {receipts.map((r) => (
              <li key={r.nonce}>
                <Link
                  href={`/app/activity/${r.nonce}?vault=${vault.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg)]"
                  style={{ transition: 'background-color var(--dur-instant) var(--ease-snap)' }}
                >
                  <StatusBadge dot tone={r.status === 'settled' ? 'success' : r.status === 'pending' ? 'warning' : r.status === 'disputed' ? 'danger' : 'muted'}>
                    {r.status}
                  </StatusBadge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.recipientLabel ?? r.recipient}</div>
                    <div className="font-mono text-[11px] text-[var(--muted)] truncate">{r.taskId}</div>
                  </div>
                  <div className="tabular text-sm font-medium">${formatUsdc(r.amountUsdc * 1_000_000)}</div>
                  <RelativeTime value={r.createdAt} className="text-[12px] text-[var(--muted)] w-20 text-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </li>
  );
}
