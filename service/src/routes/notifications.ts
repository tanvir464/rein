import { Hono } from 'hono';

import type { Env } from '../env';
import { requireAuth, type AuthedContext } from '../auth/middleware';
import {
  clearChannel,
  getSubscribers,
  patchSubscribers,
} from '../notifications/storage';
import { dispatchEvent } from '../notifications/dispatch';
import type { NotificationEvent } from '../notifications/types';
import { logLine } from '../log';

export const notificationsRouter = new Hono<AuthedContext>();

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/notifications/subscribers
// ─────────────────────────────────────────────────────────────────────────
notificationsRouter.get(
  '/v1/notifications/subscribers',
  requireAuth('read'),
  async (c: any) => {
    const env: Env = c.env;
    const auth = c.get('auth');
    if (!env.REIN_KV) return c.json({ error: 'KV not configured' }, 503);
    const subs = await getSubscribers(env.REIN_KV, auth.payload.vault);
    // Don't leak the webhook secret on read.
    const safe = {
      webhook: subs.webhook ? { url: subs.webhook.url, hasSecret: !!subs.webhook.secret } : null,
      telegram: subs.telegram ? { chatId: subs.telegram.chatId } : null,
    };
    return c.json(safe, 200);
  },
);

// ─────────────────────────────────────────────────────────────────────────
// PUT /v1/notifications/webhook  body: { url, secret? }
// ─────────────────────────────────────────────────────────────────────────
notificationsRouter.put(
  '/v1/notifications/webhook',
  requireAuth('read'),
  async (c: any) => {
    const env: Env = c.env;
    const auth = c.get('auth');
    if (!env.REIN_KV) return c.json({ error: 'KV not configured' }, 503);
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'body must be JSON' }, 400);
    }
    if (!body.url || typeof body.url !== 'string' || !/^https?:\/\//.test(body.url)) {
      return c.json({ error: 'url must be an http(s) URL' }, 400);
    }
    const secret = typeof body.secret === 'string' ? body.secret : undefined;
    await patchSubscribers(env.REIN_KV, auth.payload.vault, {
      webhook: { url: body.url, secret },
    });
    logLine({ route: 'PUT /v1/notifications/webhook', vault: auth.payload.vault, outcome: 'ok' });
    return c.json({ ok: true }, 200);
  },
);

// ─────────────────────────────────────────────────────────────────────────
// PUT /v1/notifications/telegram  body: { chatId }
// ─────────────────────────────────────────────────────────────────────────
notificationsRouter.put(
  '/v1/notifications/telegram',
  requireAuth('read'),
  async (c: any) => {
    const env: Env = c.env;
    const auth = c.get('auth');
    if (!env.REIN_KV) return c.json({ error: 'KV not configured' }, 503);
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'body must be JSON' }, 400);
    }
    const chatId = typeof body.chatId === 'string' ? body.chatId : String(body.chatId ?? '');
    if (!chatId) return c.json({ error: 'chatId is required' }, 400);
    if (!env.TELEGRAM_BOT_TOKEN) {
      return c.json(
        { error: 'TELEGRAM_BOT_TOKEN not configured on this Worker; events will be skipped' },
        503,
      );
    }
    await patchSubscribers(env.REIN_KV, auth.payload.vault, { telegram: { chatId } });
    logLine({ route: 'PUT /v1/notifications/telegram', vault: auth.payload.vault, outcome: 'ok' });
    return c.json({ ok: true }, 200);
  },
);

// ─────────────────────────────────────────────────────────────────────────
// DELETE /v1/notifications/:channel
// ─────────────────────────────────────────────────────────────────────────
notificationsRouter.delete(
  '/v1/notifications/:channel',
  requireAuth('read'),
  async (c: any) => {
    const env: Env = c.env;
    const auth = c.get('auth');
    if (!env.REIN_KV) return c.json({ error: 'KV not configured' }, 503);
    const channel = c.req.param('channel');
    if (channel !== 'webhook' && channel !== 'telegram') {
      return c.json({ error: 'channel must be webhook or telegram' }, 400);
    }
    await clearChannel(env.REIN_KV, auth.payload.vault, channel);
    return c.json({ ok: true }, 200);
  },
);

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/notifications/test  body: { type? }
// Fires a synthetic event through every registered channel for the vault.
// ─────────────────────────────────────────────────────────────────────────
notificationsRouter.post(
  '/v1/notifications/test',
  requireAuth('read'),
  async (c: any) => {
    const env: Env = c.env;
    const auth = c.get('auth');
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // empty body is fine
    }
    const type: NotificationEvent['type'] = body.type ?? 'spend.completed';
    const ts = Math.floor(Date.now() / 1000);
    let event: NotificationEvent;
    switch (type) {
      case 'spend.completed':
        event = {
          type: 'spend.completed',
          vault: auth.payload.vault,
          signature: 'TEST_SIGNATURE',
          receiptPda: 'TEST_RECEIPT_PDA',
          amount: '50000',
          recipient: 'TEST_RECIPIENT',
          policyVersion: 1,
          ts,
        };
        break;
      case 'spend.rejected':
        event = {
          type: 'spend.rejected',
          vault: auth.payload.vault,
          stage: 'simulate',
          reason: 'ErrPerTxCap',
          amount: '600000',
          ts,
        };
        break;
      case 'step_up.requested':
        event = {
          type: 'step_up.requested',
          vault: auth.payload.vault,
          requestPda: 'TEST_REQUEST_PDA',
          amount: '2000000',
          recipient: 'TEST_RECIPIENT',
          nonce: '1',
          expiresAt: ts + 300,
          ts,
        };
        break;
      case 'step_up.approved':
        event = {
          type: 'step_up.approved',
          vault: auth.payload.vault,
          requestPda: 'TEST_REQUEST_PDA',
          ts,
        };
        break;
      default:
        return c.json({ error: `unknown event type: ${type}` }, 400);
    }
    const results = await dispatchEvent(env, auth.payload.vault, event);
    return c.json({ event, results }, 200);
  },
);
