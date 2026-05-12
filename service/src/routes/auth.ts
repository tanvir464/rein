import { Hono } from 'hono';
import { PublicKey } from '@solana/web3.js';

import type { Env } from '../env';
import { programFromEnv } from '../solana/rpc';
import { logLine } from '../log';
import { verifyChallenge } from '../auth/challenge';
import { issueToken, revokeKid, type Scope } from '../auth/tokens';
import { requireAuth, type AuthedContext } from '../auth/middleware';

const VALID_SCOPES: Scope[] = ['spend', 'read', 'step_up_approve'];
const TOKEN_TTL_SECS = 3600;
const REFRESH_TTL_SECS = 3600;

export const authRouter = new Hono<{ Bindings: Env }>();

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/auth/issue
//   body: { vault, message, signature, scopes? }
//   200:  { token, kid, expiresAt, scopes }
//   400:  malformed input
//   401:  bad signature / message
//   404:  vault not found on-chain
// ─────────────────────────────────────────────────────────────────────────
authRouter.post('/v1/auth/issue', async (c) => {
  const start = Date.now();
  const env = c.env;
  if (!env.REIN_KV) {
    return c.json({ error: 'REIN_KV binding not configured' }, 503);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'body must be JSON' }, 400);
  }
  const vaultStr: string | undefined = body.vault;
  const message: string | undefined = body.message;
  const signature: string | undefined = body.signature;
  const requestedScopes: Scope[] = Array.isArray(body.scopes) ? body.scopes : ['spend', 'read'];

  if (!vaultStr || !message || !signature) {
    return c.json({ error: 'vault, message, signature are required' }, 400);
  }
  for (const s of requestedScopes) {
    if (!VALID_SCOPES.includes(s)) {
      return c.json({ error: `unknown scope: ${s}`, validScopes: VALID_SCOPES }, 400);
    }
  }

  let vault: PublicKey;
  try {
    vault = new PublicKey(vaultStr);
  } catch {
    return c.json({ error: 'vault is not a valid base58 pubkey' }, 400);
  }

  // Read on-chain Vault to get owner.
  const program = programFromEnv(env);
  let ownerPubkey: PublicKey;
  try {
    const v = await program.account.vault.fetch(vault);
    ownerPubkey = v.owner as PublicKey;
  } catch (e: any) {
    const msg: string = e?.message ?? String(e);
    if (/Account does not exist|could not find/.test(msg)) {
      return c.json({ error: 'vault not found on-chain' }, 404);
    }
    logLine({ route: 'POST /v1/auth/issue', vault: vaultStr, outcome: 'rpc_error', err: msg });
    return c.json({ error: 'on-chain read failed', detail: msg }, 502);
  }

  const ch = verifyChallenge(message, signature, ownerPubkey, vaultStr);
  if (!ch.ok) {
    logLine({ route: 'POST /v1/auth/issue', vault: vaultStr, outcome: 'auth_fail', reason: ch.reason });
    return c.json({ error: 'challenge verification failed', reason: ch.reason }, 401);
  }

  const issued = await issueToken(
    env.REIN_KV,
    env.ENVIRONMENT,
    vaultStr,
    requestedScopes,
    TOKEN_TTL_SECS,
  );

  logLine({
    route: 'POST /v1/auth/issue',
    vault: vaultStr,
    kid: issued.kid,
    scopes: issued.scopes,
    latency_ms: Date.now() - start,
    outcome: 'ok',
  });

  return c.json(issued, 200);
});

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/auth/refresh
//   Bearer <token>
//   Returns a fresh token with the same scopes + a new kid.
// ─────────────────────────────────────────────────────────────────────────
authRouter.post(
  '/v1/auth/refresh',
  requireAuth(),
  async (c: any) => {
    const env: Env = c.env;
    const auth = c.get('auth');
    const issued = await issueToken(
      env.REIN_KV!,
      env.ENVIRONMENT,
      auth.payload.vault,
      auth.payload.scopes,
      REFRESH_TTL_SECS,
    );
    logLine({
      route: 'POST /v1/auth/refresh',
      vault: auth.payload.vault,
      old_kid: auth.kid,
      new_kid: issued.kid,
      outcome: 'ok',
    });
    return c.json(issued, 200);
  },
);

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/auth/revoke
//   Bearer <token>   — revokes the calling token's kid.
//   Returns { ok: true }
// ─────────────────────────────────────────────────────────────────────────
authRouter.post(
  '/v1/auth/revoke',
  requireAuth(),
  async (c: any) => {
    const env: Env = c.env;
    const auth = c.get('auth');
    const ok = await revokeKid(env.REIN_KV!, auth.kid);
    logLine({
      route: 'POST /v1/auth/revoke',
      vault: auth.payload.vault,
      kid: auth.kid,
      outcome: ok ? 'ok' : 'unknown_kid',
    });
    return c.json({ ok }, 200);
  },
);

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/me
//   Smoke endpoint for the auth middleware. Returns the authed payload.
// ─────────────────────────────────────────────────────────────────────────
authRouter.get('/v1/me', requireAuth('read'), async (c: any) => {
  const auth = c.get('auth');
  return c.json({ vault: auth.payload.vault, scopes: auth.payload.scopes, exp: auth.payload.exp });
});
