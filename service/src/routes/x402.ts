import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import type { Env } from '../env';
import { requireAuth, type AuthedContext } from '../auth/middleware';
import { x402Spend } from '../x402/client';
import { logLine } from '../log';

export const x402Router = new Hono<AuthedContext>();

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/x402/spend
//   Bearer (scope: spend)
//   body: { url, maxAmount (micro-USDC string), method?, body?, headers? }
//   200:  { ok, content, contentType, receipt, requirement }
//   422:  { ok:false, stage, reason } — policy / parse / select rejection
//   400:  bad input
// ─────────────────────────────────────────────────────────────────────────
x402Router.post('/v1/x402/spend', requireAuth('spend'), async (c: any) => {
  const start = Date.now();
  const env: Env = c.env;
  const auth = c.get('auth');

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'body must be JSON' }, 400);
  }
  const url: string | undefined = body.url;
  const maxAmount: string | undefined = body.maxAmount;
  if (!url || !maxAmount) {
    return c.json({ error: 'url and maxAmount are required' }, 400);
  }
  if (!/^\d+$/.test(maxAmount)) {
    return c.json({ error: 'maxAmount must be a non-negative integer string (micro-USDC)' }, 400);
  }
  let vault: PublicKey;
  try {
    vault = new PublicKey(auth.payload.vault);
  } catch {
    return c.json({ error: 'token vault is not a valid base58 pubkey' }, 400);
  }

  const result = await x402Spend(env, {
    url,
    method: body.method,
    body: body.body,
    headers: body.headers,
    vault,
    maxAmountMicro: BigInt(maxAmount),
    nonce: new BN(Date.now()),
  });

  const latency = Date.now() - start;
  if (result.ok) {
    logLine({
      route: 'POST /v1/x402/spend',
      vault: vault.toBase58(),
      kid: auth.kid,
      url,
      sig: result.receipt.signature,
      amount: result.receipt.amount,
      latency_ms: latency,
      outcome: 'ok',
    });
    // BigInt is not JSON-native; flatten the requirement before returning.
    const safe = {
      ok: true as const,
      content: result.content,
      contentType: result.contentType,
      receipt: result.receipt,
      requirement: {
        facilitator: result.requirement.facilitator,
        scheme: result.requirement.scheme,
        network: result.requirement.network,
        asset: result.requirement.asset,
        amountMicro: result.requirement.amountMicro.toString(),
        recipient: result.requirement.recipient,
        expiresAt: result.requirement.expiresAt?.toISOString(),
      },
    };
    return c.json(safe, 200);
  }

  logLine({
    route: 'POST /v1/x402/spend',
    vault: vault.toBase58(),
    kid: auth.kid,
    url,
    stage: result.stage,
    reason: result.reason,
    latency_ms: latency,
    outcome: 'fail',
  });
  return c.json(result, 422);
});
