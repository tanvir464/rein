import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';

import type { Env } from '../env';
import { logLine } from '../log';
import { buildProfile } from '../goldrush/reputation';
import { getOrFetch, recipientKey, RECIPIENT_TTL } from '../goldrush/cache';
import { GoldRushError } from '../goldrush/client';

function tryPubkey(s: string): PublicKey | null {
  try {
    return new PublicKey(s);
  } catch {
    return null;
  }
}

export const recipientsRouter = new Hono<{ Bindings: Env }>();

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/recipients/:address/profile
//   Public read. Returns recipient reputation card data for the Solana
//   mainnet address. 24h KV cache. No JWT required.
// ─────────────────────────────────────────────────────────────────────────
recipientsRouter.get('/v1/recipients/:address/profile', async (c) => {
  const start = Date.now();
  const env = c.env;
  const address = c.req.param('address');
  const pk = tryPubkey(address);
  if (!pk) {
    return c.json({ error: 'address is not a valid base58 pubkey' }, 400);
  }

  try {
    const result = await getOrFetch(
      env.REIN_KV,
      recipientKey(address),
      RECIPIENT_TTL,
      () => buildProfile(address, env.GOLDRUSH_API_KEY),
    );

    logLine({
      route: 'GET /v1/recipients/:address/profile',
      address,
      rating: result.value.rating,
      fresh: result.fresh,
      latency_ms: Date.now() - start,
      outcome: 'ok',
    });

    return c.json(result.value, 200, {
      'cache-control': `public, max-age=${RECIPIENT_TTL}`,
    });
  } catch (e: unknown) {
    if (e instanceof GoldRushError) {
      logLine({
        route: 'GET /v1/recipients/:address/profile',
        address,
        outcome: 'goldrush_error',
        status: e.status,
      });
      return c.json(
        { error: 'goldrush upstream error', status: e.status, detail: e.body.slice(0, 200) },
        e.status === 0 ? 503 : 502,
      );
    }
    const msg: string = (e as Error)?.message ?? String(e);
    logLine({
      route: 'GET /v1/recipients/:address/profile',
      address,
      outcome: 'error',
      err: msg,
    });
    return c.json({ error: 'failed to fetch recipient profile', detail: msg }, 500);
  }
});
