import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, AlertOctagon, Check, X, ShieldCheck } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { REIN_PROGRAM_ID, RECEIPT_SEED } from '@rein/sdk';
import { Button } from '../../../../components/button';
import { Card } from '../../../../components/card';
import { StatusBadge } from '../../../../components/status-badge';
import { listVaults, listReceipts, getConfig, getPolicy, listPrivateReceipts } from '../../../../lib/api';
import { explorerUrl, formatUsdc, truncate } from '../../../../lib/format';
import { RelativeTime } from '../../../../components/relative-time';
import { DisputeButton } from './dispute-button';
import { ShareButton } from './share-button';
import { PrivateReceiptDetail } from './private-receipt-detail';
import { RecipientMiniReputation } from '../../../../components/reputation-card';

export const dynamic = 'force-dynamic';

export default async function ReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ nonce: string }>;
  searchParams: Promise<{ vault?: string }>;
}) {
  const { nonce } = await params;
  const { vault: vaultParam } = await searchParams;

  // Without a vault context the receipt nonce is ambiguous on real chain.
  // The activity feed always passes ?vault=…; redirect-quality guard in case.
  if (!vaultParam) notFound();

  const [receipts, privateReceipts, vaults, config, policy] = await Promise.all([
    listReceipts(vaultParam, 200),
    listPrivateReceipts(vaultParam),
    listVaults(),
    getConfig(),
    getPolicy(vaultParam),
  ]);
  const receipt = receipts.find((r) => r.nonce === nonce);
  const privateReceipt = privateReceipts.find((r) => r.nonce === nonce);

  // Confidential receipt path renders entirely client-side because the memo
  // decrypt depends on the connected wallet's view key.
  if (!receipt && privateReceipt) {
    const cluster = (await getConfig())?.cluster ?? 'devnet';
    return (
      <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--prose)' }}>
        <Link
          href="/app/activity"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] mb-4"
        >
          <ArrowLeft size={14} /> All activity
        </Link>
        <PrivateReceiptDetail
          receipt={privateReceipt}
          cluster={cluster as 'devnet' | 'mainnet-beta' | 'localnet'}
        />
      </div>
    );
  }
  if (!receipt) notFound();
  const vault = vaults.find((v) => v.id === receipt.vaultId);
  const cluster = config?.cluster ?? 'devnet';

  // Derive the receipt PDA so the Explorer link works even when the worker
  // doesn't surface the original tx signature. Done inline (not via the SDK
  // helper) to avoid pulling `bn.js` into the apps/web bundle — Next.js's
  // strict module resolution doesn't follow @solana/web3.js's transitive deps.
  let receiptPda: string | null = null;
  try {
    const vaultKey = new PublicKey(receipt.vaultId);
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(BigInt(receipt.nonce), 0);
    const [pda] = PublicKey.findProgramAddressSync(
      [RECEIPT_SEED, vaultKey.toBuffer(), nonceBuf],
      REIN_PROGRAM_ID,
    );
    receiptPda = pda.toBase58();
  } catch {
    // bad nonce or vault — fall back to no explorer link
  }

  // Reconstruct the on-chain policy checks the spend passed at submission
  // time. The receipt landed, so by definition every check returned ok —
  // but seeing them spelled out is the whole "every payment auditable"
  // pitch. Values are pulled from the *current* policy; for receipts predating
  // a policy-version bump these might differ slightly from what was enforced.
  const checks = policy
    ? buildPolicyChecks({
        amountUsdc: receipt.amountUsdc,
        recipient: receipt.recipient,
        policy,
      })
    : null;

  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--prose)' }}>
      <Link href="/app/activity" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] mb-4">
        <ArrowLeft size={14} /> All activity
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="m-0 text-[28px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
              Receipt
            </h1>
            <StatusBadge
              dot
              tone={
                receipt.status === 'settled' ? 'success'
                  : receipt.status === 'pending' ? 'warning'
                    : receipt.status === 'disputed' ? 'danger'
                      : 'muted'
              }
            >
              {receipt.status}
            </StatusBadge>
          </div>
          <div className="font-mono text-[12px] text-[var(--muted)]">{receipt.nonce}</div>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton
            explorerUrl={
              receipt.txSig
                ? explorerUrl(receipt.txSig)
                : receiptPda
                  ? `https://explorer.solana.com/address/${receiptPda}?cluster=${cluster}`
                  : null
            }
            title={`REIN receipt · $${formatUsdc(receipt.amountUsdc * 1_000_000)}`}
          />
          {(receipt.txSig || receiptPda) && (
            <a
              href={
                receipt.txSig
                  ? explorerUrl(receipt.txSig)
                  : `https://explorer.solana.com/address/${receiptPda}?cluster=${cluster}`
              }
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" size="sm">
                <ExternalLink size={13} /> Explorer
              </Button>
            </a>
          )}
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <div className="text-[12px] uppercase tracking-wider text-[var(--muted)] mb-1">Amount</div>
            <div className="tabular text-[40px] font-semibold leading-none">
              <span className="text-[var(--muted)] mr-1 text-[24px]">$</span>
              {formatUsdc(receipt.amountUsdc * 1_000_000)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] uppercase tracking-wider text-[var(--muted)] mb-1">Settled</div>
            <RelativeTime value={receipt.createdAt} className="text-sm tabular" />
          </div>
        </div>

        <div data-testid="recipient-mini-reputation" className="mb-4">
          <RecipientMiniReputation address={receipt.recipient} />
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Field label="Recipient" value={receipt.recipientLabel ?? receipt.recipient} mono={!receipt.recipientLabel} />
          <Field label="Vault" value={vault?.name ?? truncate(receipt.vaultId, 6, 6)} />
          <Field label="Task ID" value={receipt.taskId} mono />
          <Field label="Runtime" value={receipt.runtime ?? 'unknown'} mono />
          <Field label="Endpoint" value={receipt.endpoint ?? '—'} />
          <Field label="Tx signature" value={receipt.txSig ? truncate(receipt.txSig, 8, 8) : '—'} mono />
        </dl>
      </Card>

      {checks && (
        <Card className="p-6 mb-6">
          <h3 className="m-0 mb-4 text-[15px] font-semibold inline-flex items-center gap-2">
            <ShieldCheck size={16} color="var(--accent-700)" /> Policy check trail
          </h3>
          <p className="text-[12px] m-0 mb-4" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
            Every check the on-chain <code className="font-mono">spend</code> instruction enforced before this receipt was issued. Recomputed from policy v{policy?.version} (current).
          </p>
          <ul className="flex flex-col gap-2 text-[13px] m-0 p-0 list-none">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 py-1">
                <span className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded-full inline-flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: c.ok ? 'var(--tone-success-bg)' : 'var(--tone-danger-bg)',
                      color: c.ok ? 'var(--tone-success-fg)' : 'var(--tone-danger-fg)',
                    }}
                  >
                    {c.ok ? <Check size={11} /> : <X size={11} />}
                  </span>
                  {c.label}
                </span>
                <StatusBadge tone={c.ok ? 'success' : 'danger'} dot>
                  {c.ok ? 'pass' : 'fail'}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="m-0 mb-2 text-[15px] font-semibold inline-flex items-center gap-2">
          <AlertOctagon size={16} color="var(--danger)" /> Dispute this receipt
        </h3>
        <p className="text-[13px] text-[var(--muted)] m-0 mb-4">
          Flagging adds the recipient to your blocklist on-chain and refunds queue. The agent loses access immediately.
        </p>
        <DisputeButton nonce={receipt.nonce} vault={receipt.vaultId} cluster={cluster} />
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] uppercase tracking-wider text-[var(--muted)]">{label}</dt>
      <dd className={`m-0 mt-0.5 ${mono ? 'font-mono text-[13px]' : ''}`}>{value}</dd>
    </div>
  );
}

/**
 * Replays the policy enforcement checks against the receipt's amount and
 * recipient. Mirrors the constraints inside
 * `program/programs/rein/src/instructions/spend.rs::handler` — kept tight on
 * purpose so future drifts between off-chain UI and on-chain enforcement
 * surface as visible mismatches in the trail.
 */
function buildPolicyChecks({
  amountUsdc, recipient, policy,
}: {
  amountUsdc: number;
  recipient: string;
  policy: { dailyCapUsdc: number; perTxCapUsdc: number; stepUpThresholdUsdc: number; allowlist: string[]; blocklist: string[]; pausedAt?: string };
}): { label: string; ok: boolean }[] {
  const perTxOk = amountUsdc <= policy.perTxCapUsdc;
  const stepUpOk =
    policy.stepUpThresholdUsdc === 0 || amountUsdc <= policy.stepUpThresholdUsdc;
  const allowlistOk =
    policy.allowlist.length === 0 || policy.allowlist.includes(recipient);
  const blocklistOk = !policy.blocklist.includes(recipient);
  // If the receipt landed at all, the vault wasn't paused at submission time.
  const pausedOk = true;

  return [
    {
      label: policy.allowlist.length === 0
        ? 'Recipient allowlist (wildcard — none set)'
        : `Recipient on allowlist (${policy.allowlist.length} entries)`,
      ok: allowlistOk,
    },
    { label: 'Recipient not blocklisted', ok: blocklistOk },
    { label: `Per-tx cap ($${policy.perTxCapUsdc})`, ok: perTxOk },
    {
      label: policy.stepUpThresholdUsdc > 0
        ? `Step-up threshold ($${policy.stepUpThresholdUsdc}) — ${
            amountUsdc > policy.stepUpThresholdUsdc ? 'approval was required' : 'not required'
          }`
        : 'Step-up disabled (threshold = 0)',
      ok: stepUpOk,
    },
    { label: 'Vault not paused at submission', ok: pausedOk },
  ];
}
