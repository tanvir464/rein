'use client';

import { useState } from 'react';
import { AlertOctagon, AlertCircle, Check, ExternalLink } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { buildDisputeIx } from '@rein/sdk';

import { Button } from '../../../../components/button';
import { truncate } from '../../../../lib/format';

type Stage =
  | { kind: 'idle' }
  | { kind: 'reason' }
  | { kind: 'pending' }
  | { kind: 'done'; signature: string }
  | { kind: 'error'; message: string };

export function DisputeButton({
  nonce, vault, cluster = 'devnet',
}: {
  nonce: string;
  vault: string;
  cluster?: 'devnet' | 'mainnet-beta' | 'localnet';
}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [reason, setReason] = useState('');

  const submit = async () => {
    if (!publicKey || !signTransaction) {
      setStage({ kind: 'error', message: 'Wallet not connected.' });
      return;
    }
    setStage({ kind: 'pending' });
    try {
      const ix = await buildDisputeIx({
        owner: publicKey,
        vault: new PublicKey(vault),
        nonce: BigInt(nonce),
      });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight });
      tx.add(ix);
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      setStage({ kind: 'done', signature: sig });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStage({ kind: 'error', message: msg });
    }
  };

  if (stage.kind === 'idle') {
    return (
      <Button variant="danger" onClick={() => setStage({ kind: 'reason' })}>
        <AlertOctagon size={14} /> Open dispute
      </Button>
    );
  }

  if (stage.kind === 'reason') {
    return (
      <div className="flex flex-col gap-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="What went wrong? (kept locally for your records — on-chain only stores the recipient blocklist)"
          className="w-full p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] text-sm outline-none focus:border-[var(--accent-700)]"
          style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setStage({ kind: 'idle' })}>Cancel</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 4}
            onClick={submit}
          >
            Submit dispute on-chain
          </Button>
        </div>
      </div>
    );
  }

  if (stage.kind === 'pending') {
    return <Button variant="danger" loading disabled>Submitting on-chain…</Button>;
  }

  if (stage.kind === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] text-[12px]"
          style={{ background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-fg)' }}
        >
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span className="flex-1 break-all">{stage.message}</span>
        </div>
        <div>
          <Button variant="ghost" onClick={() => setStage({ kind: 'idle' })}>Try again</Button>
        </div>
      </div>
    );
  }

  // stage.kind === 'done'
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm"
      style={{ background: 'var(--tone-success-bg)', color: 'var(--tone-success-fg)' }}
    >
      <Check size={14} className="mt-0.5 shrink-0" />
      <span className="flex-1">
        Dispute submitted · recipient blocklisted on-chain ·{' '}
        <a
          href={`https://explorer.solana.com/tx/${stage.signature}?cluster=${cluster}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono inline-flex items-center gap-1 hover:underline"
        >
          {truncate(stage.signature, 6, 6)} <ExternalLink size={11} />
        </a>
      </span>
    </div>
  );
}
