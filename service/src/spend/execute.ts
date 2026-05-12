import { Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import BN from 'bn.js';
import bs58 from 'bs58';

import { simulate, type SimReason } from '@rein/sdk';

import type { Env } from '../env';
import { rpcFromEnv, programFromEnv } from '../solana/rpc';
import { loadSimulatorState } from '../policy/load-state';
import { buildSpendTx } from '../tx/build-spend';

export type ExecuteSpendInput = {
  vault: PublicKey;
  recipientUsdcAta: PublicKey;
  amount: BN;
  nonce: BN;
  x402UrlHash?: number[]; // 32 bytes; defaults to zeros for direct transfers
};

export type ExecuteSpendOk = {
  ok: true;
  signature: string;
  receiptPda: string;
  nonce: string;
  amount: string;
  policyVersion: number;
  recipient: string;
};

export type ExecuteSpendFail = {
  ok: false;
  stage: 'load' | 'simulate' | 'build' | 'sign' | 'submit' | 'confirm';
  reason: SimReason | string;
};

export type ExecuteSpendResult = ExecuteSpendOk | ExecuteSpendFail;

function getDelegate(env: Env): Keypair {
  if (!env.DELEGATE_KEYPAIR_BASE58) {
    throw new Error('DELEGATE_KEYPAIR_BASE58 not configured');
  }
  return Keypair.fromSecretKey(bs58.decode(env.DELEGATE_KEYPAIR_BASE58));
}

const ZERO_HASH: number[] = Array(32).fill(0);

/**
 * The full spend pipeline:
 *   1. Read on-chain state (Vault, Policy, Blocklist, DailyCounter, StepUp).
 *   2. Run the off-chain simulator — fail-closed pre-check.
 *   3. Build the spend tx via F12.
 *   4. Sign with the delegate keypair (fee payer; no vault authority).
 *   5. Submit + wait for confirmation.
 *   6. Return signature + receipt PDA.
 *
 * Caller (route handler) just translates the result to HTTP status.
 */
export async function executeSpend(
  env: Env,
  input: ExecuteSpendInput,
): Promise<ExecuteSpendResult> {
  const delegate = getDelegate(env);
  const conn = rpcFromEnv(env);
  const program = programFromEnv(env);

  // 1. Load state
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

  // 2. Simulate
  const day = new BN(Math.floor(nowSec / 86_400));
  const simResult = simulate(state, {
    amount: input.amount,
    recipient: input.recipientUsdcAta,
    nonce: input.nonce,
    day,
  });
  if (!simResult.ok) {
    return { ok: false, stage: 'simulate', reason: simResult.reason };
  }

  // 3. Build (read fresh vault to get usdc_mint + derive ATAs)
  let usdcMint: PublicKey;
  let vaultUsdcAta: PublicKey;
  try {
    const vaultAcct = await program.account.vault.fetch(input.vault);
    usdcMint = vaultAcct.usdcMint as PublicKey;
    vaultUsdcAta = await getAssociatedTokenAddress(usdcMint, input.vault, true);
  } catch (e: any) {
    return { ok: false, stage: 'load', reason: `vault read: ${e?.message ?? e}` };
  }

  let built;
  try {
    built = await buildSpendTx(
      {
        payer: delegate.publicKey,
        vault: input.vault,
        usdcMint,
        vaultUsdcAta,
        recipientUsdcAta: input.recipientUsdcAta,
        spendArgs: {
          amount: input.amount,
          nonce: input.nonce,
          x402UrlHash: input.x402UrlHash ?? ZERO_HASH,
          day,
        },
      },
      conn,
    );
  } catch (e: any) {
    return { ok: false, stage: 'build', reason: e?.message ?? String(e) };
  }

  // 4. Sign
  try {
    built.transaction.sign([delegate]);
  } catch (e: any) {
    return { ok: false, stage: 'sign', reason: e?.message ?? String(e) };
  }

  // 5. Submit
  let signature: string;
  try {
    signature = await conn.sendTransaction(built.transaction, {
      skipPreflight: false,
      maxRetries: 3,
    });
  } catch (e: any) {
    return { ok: false, stage: 'submit', reason: e?.message ?? String(e) };
  }

  // 6. Confirm via HTTP polling (Workers don't support web3.js WebSockets reliably).
  try {
    const deadline = Date.now() + 30_000; // 30 s ceiling
    while (Date.now() < deadline) {
      const status = await conn.getSignatureStatuses([signature], { searchTransactionHistory: false });
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
    // Final check — if still pending, surface as confirm timeout.
    const final = await conn.getSignatureStatuses([signature]);
    const fv = final?.value?.[0];
    if (!fv || (fv.confirmationStatus !== 'confirmed' && fv.confirmationStatus !== 'finalized')) {
      return { ok: false, stage: 'confirm', reason: 'confirmation timed out (30s)' };
    }
    if (fv.err) {
      return { ok: false, stage: 'confirm', reason: JSON.stringify(fv.err) };
    }
  } catch (e: any) {
    return { ok: false, stage: 'confirm', reason: e?.message ?? String(e) };
  }

  return {
    ok: true,
    signature,
    receiptPda: built.expectedReceiptPda.toBase58(),
    nonce: input.nonce.toString(),
    amount: input.amount.toString(),
    policyVersion: state.policy.version,
    recipient: input.recipientUsdcAta.toBase58(),
  };
}
