import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import BN from 'bn.js';
import bs58 from 'bs58';
import { createHash, randomBytes } from 'node:crypto';

import { buildRecordPrivateSpendIx, type SimReason } from '@rein/sdk';

import type { Env } from '../env';
import { rpcFromEnv, programFromEnv } from '../solana/rpc';
import { loadSimulatorState } from '../policy/load-state';
import { simulatePrivate } from '../umbra/policy';
import { createUtxo, type CreateUtxoResponse } from '../umbra/client';

export type ExecutePrivateInput = {
  vault: PublicKey;
  recipientPubkey: PublicKey;
  mint: PublicKey;
  amount: BN;
  nonce: BN;
  x402Url?: string;
};

export type ExecutePrivateOk = {
  ok: true;
  nonce: string;
  receiptPubkey: string;
  umbraSignature: string;
  recordSignature: string;
  policyVersion: number;
  recipientCommit: string;
  umbraRef: string;
};

export type ExecutePrivateFail = {
  ok: false;
  stage: 'config' | 'load' | 'simulate' | 'sidecar' | 'build' | 'sign' | 'submit' | 'confirm';
  reason: SimReason | string;
};

export type ExecutePrivateResult = ExecutePrivateOk | ExecutePrivateFail;

function getDelegate(env: Env): Keypair {
  if (!env.DELEGATE_KEYPAIR_BASE58) {
    throw new Error('DELEGATE_KEYPAIR_BASE58 not configured');
  }
  return Keypair.fromSecretKey(bs58.decode(env.DELEGATE_KEYPAIR_BASE58));
}

// recipient_commit = sha256(recipient_pubkey || nonce_le). Matches the test/oracle
// in `program/tests/private-spend.ts`. Poseidon would also work, but sha256 is
// available everywhere (no zk-friendly hash dep in the Worker).
function recipientCommit(recipient: PublicKey, nonce: BN): Buffer {
  const h = createHash('sha256');
  h.update(recipient.toBuffer());
  h.update(nonce.toArrayLike(Buffer, 'le', 8));
  return h.digest();
}

function umbraRefFromSig(sigBase58: string): Buffer {
  return createHash('sha256').update(sigBase58, 'utf8').digest();
}

export async function executePrivateSpend(
  env: Env,
  input: ExecutePrivateInput,
): Promise<ExecutePrivateResult & { sidecarResponse?: CreateUtxoResponse }> {
  if (!env.UMBRA_SIDECAR_URL || !env.SIDECAR_HMAC_KEY) {
    return { ok: false, stage: 'config', reason: 'UMBRA_SIDECAR_URL or SIDECAR_HMAC_KEY not set' };
  }

  let delegate: Keypair;
  try {
    delegate = getDelegate(env);
  } catch (e: any) {
    return { ok: false, stage: 'config', reason: e?.message ?? String(e) };
  }

  const conn = rpcFromEnv(env);
  const program = programFromEnv(env);

  let state;
  let nowSec: number;
  try {
    const slot = await conn.getSlot('confirmed');
    const blockTime = await conn.getBlockTime(slot);
    nowSec = blockTime ?? Math.floor(Date.now() / 1000);
    state = await loadSimulatorState(program, input.vault, input.nonce, nowSec);
  } catch (e: any) {
    return { ok: false, stage: 'load', reason: e?.message ?? String(e) };
  }

  const day = new BN(Math.floor(nowSec / 86_400));
  const sim = simulatePrivate(state, {
    amount: input.amount,
    recipient: input.recipientPubkey,
    nonce: input.nonce,
    day,
  });
  if (!sim.ok) {
    return { ok: false, stage: 'simulate', reason: sim.reason };
  }

  // Call sidecar to create the real Umbra UTXO. The refTag is a random nonce
  // the sidecar includes in its create-UTXO call; we hash the returned Umbra
  // signature into `umbra_ref` for on-chain anti-replay.
  const refTag = randomBytes(16).toString('hex');
  const sidecarRes = await createUtxo(
    { sidecarUrl: env.UMBRA_SIDECAR_URL, hmacKey: env.SIDECAR_HMAC_KEY, timeoutMs: 45_000 },
    {
      destinationAddress: input.recipientPubkey.toBase58(),
      mint: input.mint.toBase58(),
      amount: input.amount.toString(),
      refTag,
    },
  );
  if ('ok' in sidecarRes && sidecarRes.ok === false) {
    return { ok: false, stage: 'sidecar', reason: `sidecar ${sidecarRes.status}: ${sidecarRes.body}` };
  }
  const sidecar = sidecarRes as CreateUtxoResponse;

  const commit = recipientCommit(input.recipientPubkey, input.nonce);
  const umbraRef = umbraRefFromSig(sidecar.umbraSignature);

  let built;
  try {
    built = await buildRecordPrivateSpendIx({
      payer: delegate.publicKey,
      vault: input.vault,
      args: {
        amount: BigInt(input.amount.toString()),
        nonce: BigInt(input.nonce.toString()),
        recipientCommit: commit,
        umbraRef,
        day: BigInt(day.toString()),
      },
    });
  } catch (e: any) {
    return { ok: false, stage: 'build', reason: e?.message ?? String(e) };
  }

  let recordSig: string;
  try {
    const { blockhash } = await conn.getLatestBlockhash('confirmed');
    const msg = new TransactionMessage({
      payerKey: delegate.publicKey,
      recentBlockhash: blockhash,
      instructions: [built.ix],
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    tx.sign([delegate]);
    recordSig = await conn.sendTransaction(tx, { skipPreflight: false, maxRetries: 3 });
  } catch (e: any) {
    return { ok: false, stage: 'submit', reason: e?.message ?? String(e) };
  }

  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const status = await conn.getSignatureStatuses([recordSig], { searchTransactionHistory: false });
      const v = status?.value?.[0];
      if (v) {
        if (v.err) {
          return { ok: false, stage: 'confirm', reason: JSON.stringify(v.err) };
        }
        if (v.confirmationStatus === 'confirmed' || v.confirmationStatus === 'finalized') {
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  } catch (e: any) {
    return { ok: false, stage: 'confirm', reason: e?.message ?? String(e) };
  }

  return {
    ok: true,
    nonce: input.nonce.toString(),
    receiptPubkey: built.receipt.toBase58(),
    umbraSignature: sidecar.umbraSignature,
    recordSignature: recordSig,
    policyVersion: sim.policyVersion,
    recipientCommit: commit.toString('hex'),
    umbraRef: umbraRef.toString('hex'),
    sidecarResponse: sidecar,
  };
}
