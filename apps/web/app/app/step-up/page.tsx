'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Fingerprint, X, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { buildApproveStepUpIx } from '@rein/sdk';

import { Card } from '../../../components/card';
import { Button } from '../../../components/button';
import { StatusBadge } from '../../../components/status-badge';
import { EmptyState } from '../../../components/empty-state';
import { type StepUp, type Vault } from '../../../lib/types';
import { listVaults, listStepUpsForVaults, getConfig, type Config } from '../../../lib/api';
import { formatUsdc, truncate } from '../../../lib/format';
import { useAuth } from '../../../components/auth-provider';

export default function StepUpPage() {
  const { owner } = useAuth();
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [items, setItems] = useState<StepUp[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [active, setActive] = useState<StepUp | null>(null);
  const [result, setResult] = useState<
    | { kind: 'ok'; id: string; signature: string }
    | { kind: 'err'; id: string; message: string }
    | null
  >(null);
  const [, force] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Only show step-ups for vaults this wallet owns.
      if (!owner) {
        setVaults([]);
        setItems([]);
        setHydrated(true);
        return;
      }
      const vs = await listVaults(owner);
      setVaults(vs);
      const su = await listStepUpsForVaults(vs.map((v) => v.id));
      setItems(su);
      setHydrated(true);
    };
    load();
    getConfig().then(setConfig);
    const poll = setInterval(load, 10_000);
    const tick = setInterval(() => force((n) => n + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [owner]);

  const onApprove = async (su: StepUp) => {
    if (!publicKey || !signTransaction) {
      setResult({ kind: 'err', id: su.id, message: 'Wallet not connected.' });
      return;
    }
    try {
      const ix = await buildApproveStepUpIx({
        owner: publicKey,
        vault: new PublicKey(su.vaultId),
        stepUpRequest: new PublicKey(su.id),
      });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight });
      tx.add(ix);
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      // Optimistic local update — next poll (10s) will sync from chain anyway.
      setItems((prev) => prev.map((s) => (s.id === su.id ? { ...s, status: 'approved' } : s)));
      setResult({ kind: 'ok', id: su.id, signature: sig });
    } catch (e) {
      setResult({ kind: 'err', id: su.id, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setActive(null);
    }
  };

  // No on-chain "reject" instruction — deny is local-only. The request will
  // auto-expire at its TTL anyway.
  const onDeny = (id: string) => {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'denied' } : s)));
    setActive(null);
  };

  const pending = items.filter((s) => s.status === 'pending');
  const recent = items.filter((s) => s.status !== 'pending');

  return (
    <div className="px-6 md:px-10 py-8 mx-auto" style={{ maxWidth: 'var(--container)' }}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="m-0 text-[32px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Step-up</h1>
          <p className="m-0 mt-1 text-[var(--muted)] text-sm">
            Out-of-band approvals for spends over policy thresholds.
          </p>
        </div>
        <StatusBadge tone={pending.length ? 'accent' : 'muted'} dot={pending.length > 0}>
          {pending.length} pending
        </StatusBadge>
      </div>

      {result?.kind === 'ok' && (
        <div
          className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] flex items-start gap-2 text-[13px]"
          style={{ background: 'var(--tone-success-bg)', color: 'var(--tone-success-fg)' }}
        >
          <Check size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">
            Step-up approved on-chain ·{' '}
            <a
              href={`https://explorer.solana.com/tx/${result.signature}?cluster=${config?.cluster ?? 'devnet'}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono inline-flex items-center gap-1 hover:underline"
            >
              {truncate(result.signature, 6, 6)} <ExternalLink size={11} />
            </a>
          </span>
          <button
            onClick={() => setResult(null)}
            aria-label="Dismiss"
            className="text-current opacity-70 hover:opacity-100"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {result?.kind === 'err' && (
        <div
          className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] flex items-start gap-2 text-[13px]"
          style={{ background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-fg)' }}
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1 break-all">{result.message}</span>
          <button
            onClick={() => setResult(null)}
            aria-label="Dismiss"
            className="text-current opacity-70 hover:opacity-100"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <h2 className="m-0 mb-3 text-[15px] font-semibold">Pending approvals</h2>
      {pending.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing waiting on you"
          body="Step-ups appear here when an agent needs out-of-band approval. They expire after 10 minutes."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          {pending.map((s) => {
            const vault = vaults.find((v) => v.id === s.vaultId);
            const remaining = Math.max(0, new Date(s.expiresAt).getTime() - Date.now());
            const totalTtl = 10 * 60_000;
            const pct = Math.min(100, (remaining / totalTtl) * 100);
            return (
              <Card key={s.id} className="p-5 fade-in border-[var(--accent-700)]" style={{ borderColor: 'var(--accent-700)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="text-[12px] uppercase tracking-wider text-[var(--muted)]">{vault?.name}</div>
                    <div className="font-semibold truncate">{s.recipientLabel ?? s.recipient}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] uppercase tracking-wider text-[var(--muted)]">Amount</div>
                    <div className="tabular text-[24px] font-semibold leading-none">
                      <span className="text-[var(--muted)] text-[14px]">$</span>{formatUsdc(s.amountUsdc * 1_000_000)}
                    </div>
                  </div>
                </div>
                <div className="text-[13px] text-[var(--muted)] mb-3">
                  Triggered: <span className="text-[var(--fg)]">{s.reason}</span>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[12px] text-[var(--muted)] mb-1.5">
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> Expires</span>
                    <span className="tabular" suppressHydrationWarning>{hydrated ? `${Math.ceil(remaining / 1000)}s` : '—'}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--gray-200)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct < 30 ? 'var(--danger)' : 'var(--accent-700)', transition: 'width 1s linear' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onDeny(s.id)} className="flex-1">
                    <X size={13} /> Deny
                  </Button>
                  <Button size="sm" onClick={() => setActive(s)} className="flex-1">
                    <Check size={13} /> Approve
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h2 className="m-0 mb-3 text-[15px] font-semibold">Recent decisions</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <StatusBadge dot tone={s.status === 'approved' ? 'success' : s.status === 'denied' ? 'danger' : 'muted'}>
                    {s.status}
                  </StatusBadge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{s.recipientLabel}</div>
                    <div className="font-mono text-[11px] text-[var(--muted)]">{s.taskId}</div>
                  </div>
                  <div className="tabular text-sm font-semibold">${formatUsdc(s.amountUsdc * 1_000_000)}</div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {active && <BiometricModal stepUp={active} onApprove={() => onApprove(active)} onCancel={() => setActive(null)} />}
    </div>
  );
}

function BiometricModal({
  stepUp,
  onApprove,
  onCancel,
}: {
  stepUp: StepUp;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const trigger = () => {
    setScanning(true);
    setTimeout(onApprove, 1100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Approve step-up"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-8 fade-in"
      >
        <div className="flex flex-col items-center text-center gap-5">
          <button
            onClick={trigger}
            disabled={scanning}
            aria-label="Scan to approve"
            className="relative h-24 w-24 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'var(--accent-soft-bg)',
              color: 'var(--accent-soft-fg)',
              boxShadow: scanning ? '0 0 0 8px var(--accent-300)' : '0 0 0 0 transparent',
              transition: 'box-shadow var(--dur-slow) var(--ease-glide)',
            }}
          >
            <Fingerprint size={44} className={scanning ? 'animate-pulse' : ''} />
            {!scanning && <span className="pulse-ring absolute inset-0 rounded-full" />}
          </button>
          <div>
            <h3 className="m-0 text-[20px] font-semibold">{scanning ? 'Authenticating…' : 'Hold to approve'}</h3>
            <p className="m-0 mt-1 text-sm text-[var(--muted)]">
              Approve <span className="tabular font-medium text-[var(--fg)]">${formatUsdc(stepUp.amountUsdc * 1_000_000)}</span> to {stepUp.recipientLabel}
            </p>
          </div>
          <div className="w-full pt-3 border-t border-[var(--border)] text-[12px] text-[var(--muted)] text-left flex flex-col gap-1">
            <div className="flex justify-between"><span>Reason</span><span className="text-[var(--fg)]">{stepUp.reason}</span></div>
            <div className="flex justify-between"><span>Task</span><span className="font-mono text-[var(--fg)]">{stepUp.taskId}</span></div>
          </div>
          <div className="w-full flex items-center gap-2">
            <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={scanning}>Cancel</Button>
            <Button className="flex-1" onClick={trigger} loading={scanning} disabled={scanning}>Approve</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
