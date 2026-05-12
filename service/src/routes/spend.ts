import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import type { Env } from '../env';
import { requireAuth, type AuthedContext } from '../auth/middleware';
import { executeSpend } from '../spend/execute';
import { executePrivateSpend } from '../spend/execute-private';
import { encryptMemo, memoKvKey } from '../umbra/memo';
import { dispatchEvent } from '../notifications/dispatch';
import { getRoomStub } from '../activity/room';
import type { NotificationEvent } from '../notifications/types';
import { logLine } from '../log';

async function broadcastToRoom(env: Env, vault: string, ev: NotificationEvent) {
  const stub = getRoomStub(env, vault);
  if (!stub) return;
  try {
    await stub.fetch('http://do/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ev),
    });
  } catch {
    // best-effort; main response already returned
  }
}

export const spendRouter = new Hono<AuthedContext>();

function tryPubkey(s: string): PublicKey | null {
  try {
    return new PublicKey(s);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/spend
//   Bearer (scope: spend)
//   body: { recipient (token account base58), amount (micro-USDC string), nonce? (string) }
//   200:  ExecuteSpendOk
//   422:  policy rejection from sim — returns { stage: 'simulate', reason }
//   400:  malformed input
//   500:  on-chain / network failure
// ─────────────────────────────────────────────────────────────────────────
spendRouter.post('/v1/spend', requireAuth('spend'), async (c: any) => {
  const start = Date.now();
  const env: Env = c.env;
  const auth = c.get('auth');

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'body must be JSON' }, 400);
  }

  const recipientStr: string | undefined = body.recipient;
  const amountStr: string | undefined = body.amount;
  const nonceStr: string | undefined = body.nonce;

  if (!recipientStr || !amountStr) {
    return c.json({ error: 'recipient and amount are required' }, 400);
  }
  if (!/^\d+$/.test(amountStr)) {
    return c.json({ error: 'amount must be a non-negative integer string (micro-USDC)' }, 400);
  }
  const recipient = tryPubkey(recipientStr);
  if (!recipient) {
    return c.json({ error: 'recipient is not a valid base58 pubkey' }, 400);
  }
  const vault = tryPubkey(auth.payload.vault);
  if (!vault) {
    return c.json({ error: 'token vault is not a valid base58 pubkey' }, 400);
  }

  const nonce = nonceStr ? new BN(nonceStr) : new BN(Date.now());

  const result = await executeSpend(env, {
    vault,
    recipientUsdcAta: recipient,
    amount: new BN(amountStr),
    nonce,
  });

  const latency = Date.now() - start;
  const ts = Math.floor(Date.now() / 1000);
  if (result.ok) {
    logLine({
      route: 'POST /v1/spend',
      vault: vault.toBase58(),
      kid: auth.kid,
      amount: amountStr,
      sig: result.signature,
      latency_ms: latency,
      outcome: 'ok',
    });
    // Fire-and-await notifications (Workers-friendly; for v1.x switch to executionCtx.waitUntil).
    const ev: NotificationEvent = {
      type: 'spend.completed',
      vault: vault.toBase58(),
      signature: result.signature,
      receiptPda: result.receiptPda,
      amount: result.amount,
      recipient: result.recipient,
      policyVersion: result.policyVersion,
      ts,
    };
    await broadcastToRoom(env, vault.toBase58(), ev);
    await dispatchEvent(env, vault.toBase58(), ev);
    return c.json(result, 200);
  }

  logLine({
    route: 'POST /v1/spend',
    vault: vault.toBase58(),
    kid: auth.kid,
    amount: amountStr,
    stage: result.stage,
    reason: result.reason,
    latency_ms: latency,
    outcome: 'fail',
  });

  // Notify on simulator-stage rejections (the policy actually fired).
  if (result.stage === 'simulate') {
    const ev: NotificationEvent = {
      type: 'spend.rejected',
      vault: vault.toBase58(),
      stage: result.stage,
      reason: String(result.reason),
      amount: amountStr,
      recipient: recipient.toBase58(),
      ts,
    };
    await broadcastToRoom(env, vault.toBase58(), ev);
    await dispatchEvent(env, vault.toBase58(), ev);
  }

  // Policy rejections are 422 (semantic), system errors 500.
  const status = result.stage === 'simulate' ? 422 : 500;
  return c.json(result, status);
});

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/spend/private
//   Bearer (scope: spend)
//   body: {
//     vaultPubkey: string,
//     recipientPubkey: string,
//     mint: string,
//     amountBase: string,
//     viewKeyPub?: string (hex; required to persist encrypted memo),
//     x402Url?: string
//   }
//   200:  ExecutePrivateOk
//   422:  policy rejection { stage: 'simulate', reason }
//   502:  sidecar unreachable { stage: 'sidecar' }
//   400:  malformed input
// ─────────────────────────────────────────────────────────────────────────
spendRouter.post('/v1/spend/private', requireAuth('spend'), async (c: any) => {
  const start = Date.now();
  const env: Env = c.env;
  const auth = c.get('auth');

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'body must be JSON' }, 400);
  }

  const recipientStr: string | undefined = body.recipientPubkey;
  const mintStr: string | undefined = body.mint;
  const amountStr: string | undefined = body.amountBase ?? body.amount;
  const nonceStr: string | undefined = body.nonce;
  const viewKeyPub: string | undefined = body.viewKeyPub;

  if (!recipientStr || !mintStr || !amountStr) {
    return c.json({ error: 'recipientPubkey, mint, amountBase are required' }, 400);
  }
  if (!/^\d+$/.test(amountStr)) {
    return c.json({ error: 'amountBase must be a non-negative integer string' }, 400);
  }
  let recipient: PublicKey;
  let mint: PublicKey;
  let vault: PublicKey;
  try {
    recipient = new PublicKey(recipientStr);
    mint = new PublicKey(mintStr);
    vault = new PublicKey(auth.payload.vault);
  } catch {
    return c.json({ error: 'invalid base58 pubkey in recipientPubkey/mint/vault' }, 400);
  }

  const nonce = nonceStr ? new BN(nonceStr) : new BN(Date.now());

  const result = await executePrivateSpend(env, {
    vault,
    recipientPubkey: recipient,
    mint,
    amount: new BN(amountStr),
    nonce,
  });

  const latency = Date.now() - start;
  if (result.ok) {
    if (viewKeyPub && env.REIN_KV) {
      try {
        const memo = encryptMemo(viewKeyPub, result.nonce, {
          recipient: recipientStr,
          mint: mintStr,
          amount: amountStr,
          umbraSig: result.umbraSignature,
        });
        await env.REIN_KV.put(memoKvKey(result.nonce), JSON.stringify(memo));
      } catch {
        // Memo persistence failure does not roll back the on-chain receipt — that's intentional;
        // the on-chain record is the source of truth, memo is owner-only UX sugar.
      }
    }
    logLine({
      route: 'POST /v1/spend/private',
      vault: vault.toBase58(),
      kid: auth.kid,
      amount: amountStr,
      sig: result.recordSignature,
      umbra: result.umbraSignature,
      latency_ms: latency,
      outcome: 'ok',
    });
    return c.json(result, 200);
  }

  logLine({
    route: 'POST /v1/spend/private',
    vault: vault.toBase58(),
    kid: auth.kid,
    stage: result.stage,
    reason: String(result.reason),
    latency_ms: latency,
    outcome: 'fail',
  });

  const status =
    result.stage === 'simulate'
      ? 422
      : result.stage === 'sidecar'
        ? 502
        : result.stage === 'config'
          ? 503
          : 500;
  return c.json(result, status);
});
