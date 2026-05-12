/**
 * x402 client. Drives the full 402 dance:
 *   1. Initial GET — expect 402.
 *   2. Parse payment_requirements.
 *   3. Select cheapest acceptable Solana USDC option.
 *   4. Hash the URL (audit trail in the receipt).
 *   5. Delegate to executeSpend → real on-chain spend.
 *   6. Re-fetch with `X-Payment` header proving the spend.
 *   7. Return content + receipt metadata.
 */
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import type { Env } from '../env';
import { executeSpend, type ExecuteSpendOk } from '../spend/execute';
import { programFromEnv } from '../solana/rpc';
import { parsePaymentRequirements, selectAcceptable, type Requirement } from './parser';

export type X402Result =
  | {
      ok: true;
      content: string;            // body of the *paid* response (text)
      contentType: string;
      receipt: ExecuteSpendOk;
      requirement: Requirement;
    }
  | {
      ok: false;
      stage: 'fetch' | 'parse' | 'select' | 'spend' | 'paid_fetch';
      reason: string;
    };

async function sha256Hex(s: string): Promise<number[]> {
  const enc = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest));
}

export type X402Input = {
  url: string;
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
  vault: PublicKey;
  maxAmountMicro: bigint;
  nonce: BN;
};

export async function x402Spend(
  env: Env,
  input: X402Input,
): Promise<X402Result> {
  const method = input.method ?? 'GET';
  const init: RequestInit = {
    method,
    headers: input.headers,
    body: input.body,
  };

  // 1. Initial fetch — expect 402.
  let r1: Response;
  try {
    r1 = await fetch(input.url, init);
  } catch (e: any) {
    return { ok: false, stage: 'fetch', reason: e?.message ?? String(e) };
  }
  if (r1.status !== 402) {
    // Endpoint returned content directly without payment — pass through.
    return {
      ok: false,
      stage: 'fetch',
      reason: `endpoint returned ${r1.status}, expected 402`,
    };
  }

  // 2. Parse payment_requirements.
  let body: any;
  try {
    body = await r1.json();
  } catch (e: any) {
    return { ok: false, stage: 'parse', reason: 'response is not JSON' };
  }
  const reqs = parsePaymentRequirements(body);
  if (reqs.length === 0) {
    return { ok: false, stage: 'parse', reason: 'no payment requirements found in 402 body' };
  }

  // 3. Select cheapest acceptable Solana option matching the vault's bound mint.
  let vaultMint: string | undefined;
  try {
    const program = programFromEnv(env);
    const v = await program.account.vault.fetch(input.vault);
    vaultMint = (v.usdcMint as PublicKey).toBase58();
  } catch (e: any) {
    return { ok: false, stage: 'select', reason: `vault read: ${e?.message ?? e}` };
  }
  const choice = selectAcceptable(reqs, {
    maxAmountMicro: input.maxAmountMicro,
    vaultMint,
  });
  if (!choice) {
    return {
      ok: false,
      stage: 'select',
      reason: `no requirement matched vault mint ${vaultMint} ≤ ${input.maxAmountMicro} micro-USDC`,
    };
  }

  // 4. Hash URL for audit trail.
  const urlHash = await sha256Hex(input.url);

  // 5. Spend.
  const spend = await executeSpend(env, {
    vault: input.vault,
    recipientUsdcAta: new PublicKey(choice.recipient),
    amount: new BN(choice.amountMicro.toString()),
    nonce: input.nonce,
    x402UrlHash: urlHash,
  });
  if (!spend.ok) {
    return { ok: false, stage: 'spend', reason: `${spend.stage}: ${spend.reason}` };
  }

  // 6. Re-fetch with X-Payment header.
  const paidHeaders: Record<string, string> = {
    ...input.headers,
    'X-Payment': spend.signature,
    'X-REIN-Receipt': spend.receiptPda,
  };
  let r2: Response;
  try {
    r2 = await fetch(input.url, { ...init, headers: paidHeaders });
  } catch (e: any) {
    return { ok: false, stage: 'paid_fetch', reason: e?.message ?? String(e) };
  }

  if (r2.status === 402) {
    return {
      ok: false,
      stage: 'paid_fetch',
      reason: `endpoint did not accept payment ${spend.signature} — still returning 402`,
    };
  }

  const contentType = r2.headers.get('content-type') ?? 'application/octet-stream';
  const content = await r2.text();

  return { ok: true, content, contentType, receipt: spend, requirement: choice };
}
