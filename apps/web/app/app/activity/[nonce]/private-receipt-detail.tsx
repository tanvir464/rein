'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck, Lock, Unlock, AlertCircle } from 'lucide-react';
import { Card } from '../../../../components/card';
import { Button } from '../../../../components/button';
import { StatusBadge } from '../../../../components/status-badge';
import { RelativeTime } from '../../../../components/relative-time';
import { RecipientMiniReputation } from '../../../../components/reputation-card';
import { useAuth } from '../../../../components/auth-provider';
import { formatUsdc, truncate } from '../../../../lib/format';
import {
  getPrivateMemo,
  type PrivateReceipt,
  type EncryptedMemo,
} from '../../../../lib/api';
import {
  decryptMemo,
  getAllViewKeys,
  type ViewKey,
} from '../../../../lib/view-key';

type Decrypted = { recipient: string; mint: string; amount: string; umbraSig: string };

export function PrivateReceiptDetail({
  receipt,
  cluster,
}: {
  receipt: PrivateReceipt;
  cluster: 'devnet' | 'mainnet-beta' | 'localnet';
}) {
  const { auth, owner } = useAuth();
  const [memo, setMemo] = useState<EncryptedMemo | null>(null);
  const [memoErr, setMemoErr] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<Decrypted | null>(null);
  const [decryptErr, setDecryptErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth) {
      setMemo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await getPrivateMemo(receipt.nonce, auth.token);
      if (cancelled) return;
      if (res.ok) setMemo(res.memo);
      else setMemoErr(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, receipt.nonce]);

  async function tryDecrypt() {
    if (!memo) return;
    setBusy(true);
    setDecryptErr(null);
    try {
      const keys: ViewKey[] = auth ? getAllViewKeys(auth.vault) : [];
      if (keys.length === 0) {
        setDecryptErr('No view key derived yet. Go to Settings → View key and sign the derive challenge.');
        return;
      }
      for (const k of keys) {
        const pt = await decryptMemo(memo, receipt.nonce, k);
        if (pt) {
          setDecrypted(pt);
          return;
        }
      }
      setDecryptErr('No stored view key could decrypt this memo. Rotate the key on the same wallet that signed the receipt.');
    } finally {
      setBusy(false);
    }
  }

  const isOwner = !!owner;
  const explorerAddr = `https://explorer.solana.com/address/${receipt.id}?cluster=${cluster}`;
  const umbraSolscanHref = decrypted?.umbraSig
    ? `https://explorer.solana.com/tx/${decrypted.umbraSig}?cluster=${cluster}`
    : explorerAddr;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="m-0 text-[28px] font-semibold" style={{ letterSpacing: '-0.02em' }}>
              Private receipt
            </h1>
            <StatusBadge dot tone="muted">confidential</StatusBadge>
          </div>
          <div className="font-mono text-[12px] text-[var(--muted)]">{receipt.nonce}</div>
        </div>
        <div className="flex items-center gap-2">
          <a
            data-testid="umbra-solscan-link"
            href={umbraSolscanHref}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="secondary" size="sm">
              <ExternalLink size={13} /> Solscan
            </Button>
          </a>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <div className="text-[12px] uppercase tracking-wider text-[var(--muted)] mb-1">
              Amount
            </div>
            <div className="tabular text-[40px] font-semibold leading-none">
              <span className="text-[var(--muted)] mr-1 text-[24px]">$</span>
              {formatUsdc(Number(receipt.amount))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] uppercase tracking-wider text-[var(--muted)] mb-1">Settled</div>
            <RelativeTime
              value={new Date(receipt.ts * 1000).toISOString()}
              className="text-sm tabular"
            />
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Field
            label="Commitment"
            value={truncate(receipt.recipientCommit, 10, 8)}
            mono
          />
          <Field label="Umbra ref" value={truncate(receipt.umbraRef, 10, 8)} mono />
          <Field label="Policy version" value={`v${receipt.policyVersion}`} />
          <Field label="Receipt PDA" value={truncate(receipt.id, 6, 6)} mono />
        </dl>
      </Card>

      {!isOwner && (
        <Card className="p-5 mb-6 flex items-start gap-3">
          <Lock size={16} color="var(--muted)" className="mt-0.5 shrink-0" />
          <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
            Viewing as public observer — recipient and amount detail are encrypted on-chain.
            Sign in with the owner wallet to decrypt.
          </div>
        </Card>
      )}

      {isOwner && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} color="var(--accent-700)" />
            <h3 className="m-0 text-[15px] font-semibold flex-1">Decrypted detail</h3>
            {!decrypted && (
              <Button
                data-testid="decrypt-with-view-key"
                size="sm"
                onClick={tryDecrypt}
                loading={busy}
                disabled={!memo}
              >
                <Unlock size={13} /> Decrypt with view key
              </Button>
            )}
          </div>
          {memoErr && (
            <Flash kind="err">Memo unavailable: {memoErr}</Flash>
          )}
          {decryptErr && <Flash kind="err">{decryptErr}</Flash>}
          {!decrypted && !memo && !memoErr && (
            <p className="m-0 text-[12px]" style={{ color: 'var(--muted)' }}>
              Loading encrypted memo…
            </p>
          )}
          {decrypted && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-[12px] uppercase tracking-wider text-[var(--muted)]">Recipient</dt>
                <dd
                  data-testid="decrypted-recipient"
                  className="m-0 mt-0.5 font-mono text-[13px] break-all"
                >
                  {decrypted.recipient}
                </dd>
                <div className="mt-1">
                  <RecipientMiniReputation address={decrypted.recipient} />
                </div>
              </div>
              <div>
                <dt className="text-[12px] uppercase tracking-wider text-[var(--muted)]">Amount (USD)</dt>
                <dd
                  data-testid="decrypted-amount-usd"
                  className="m-0 mt-0.5 tabular-nums text-[15px] font-semibold"
                >
                  ${formatUsdc(Number(decrypted.amount))}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] uppercase tracking-wider text-[var(--muted)]">Mint</dt>
                <dd className="m-0 mt-0.5 font-mono text-[13px] break-all">{decrypted.mint}</dd>
              </div>
              <div>
                <dt className="text-[12px] uppercase tracking-wider text-[var(--muted)]">Umbra signature</dt>
                <dd className="m-0 mt-0.5 font-mono text-[13px] break-all">
                  <a
                    href={`https://explorer.solana.com/tx/${decrypted.umbraSig}?cluster=${cluster}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:no-underline"
                  >
                    {truncate(decrypted.umbraSig, 8, 8)}
                  </a>
                </dd>
              </div>
            </dl>
          )}
        </Card>
      )}
    </>
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

function Flash({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] text-[12px] mb-3"
      style={{
        background: kind === 'ok' ? 'var(--tone-success-bg)' : 'var(--tone-danger-bg)',
        color: kind === 'ok' ? 'var(--tone-success-fg)' : 'var(--tone-danger-fg)',
      }}
    >
      <AlertCircle size={12} className="mt-0.5" />
      <span className="flex-1 break-all">{children}</span>
    </div>
  );
}
