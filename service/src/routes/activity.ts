import { Hono } from 'hono';

import type { Env } from '../env';
import { getRoomStub } from '../activity/room';
import { verifyToken } from '../auth/tokens';
import { logLine } from '../log';

export const activityRouter = new Hono<{ Bindings: Env }>();

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/activity?vault=<base58>&token=<bearer>&since=<unix_secs>
//
// WebSocket endpoint. Auth via `?token=` query param (browsers can't set
// custom headers on WS upgrade). Forwards to the per-vault Durable Object.
// ─────────────────────────────────────────────────────────────────────────
activityRouter.get('/v1/activity', async (c) => {
  const env = c.env;
  if (!env.ACTIVITY_ROOM) {
    return c.json({ error: 'ACTIVITY_ROOM binding not configured' }, 503);
  }
  if (!env.REIN_KV) return c.json({ error: 'REIN_KV not configured' }, 503);

  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'expected WebSocket upgrade' }, 426);
  }

  const vault = c.req.query('vault');
  const token = c.req.query('token');
  const since = c.req.query('since') ?? '0';
  if (!vault || !token) {
    return c.json({ error: 'vault and token are required as query params' }, 400);
  }

  const r = await verifyToken(env.REIN_KV, token);
  if (!r.ok) {
    logLine({ route: 'GET /v1/activity', vault, outcome: 'auth_fail', reason: r.reason });
    return c.json({ error: 'token invalid', reason: r.reason }, 401);
  }
  if (r.payload.vault !== vault) {
    return c.json({ error: 'token vault mismatch' }, 403);
  }
  if (!r.payload.scopes.includes('read')) {
    return c.json({ error: 'insufficient scope', required: 'read' }, 403);
  }

  // Forward the upgrade to the DO. We rewrite the URL path so the DO routes it
  // to /connect (along with the `since` query for replay).
  const stub = getRoomStub(env, vault);
  if (!stub) return c.json({ error: 'no DO stub' }, 500);

  const doUrl = new URL('http://do/connect');
  doUrl.searchParams.set('since', since);
  return stub.fetch(doUrl.toString(), c.req.raw);
});
