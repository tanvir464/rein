import type { Env } from '../env';
import { logLine } from '../log';
import {
  alreadyDispatched,
  getSubscribers,
  markDispatched,
} from './storage';
import { sendTelegram } from './telegram';
import { sendWebhook } from './webhook';
import type { Channel, DispatchResult, NotificationEvent } from './types';

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 250;

function eventId(event: NotificationEvent): string {
  // Stable per-event identifier for idempotency dedupe.
  switch (event.type) {
    case 'spend.completed':
    case 'spend.rejected':
      return `${event.type}:${event.vault}:${(event as any).signature ?? `${event.ts}`}`;
    case 'step_up.requested':
    case 'step_up.approved':
      return `${event.type}:${event.vault}:${event.requestPda}`;
  }
}

async function trySend(
  env: Env,
  channel: Channel,
  fn: () => Promise<{ ok: boolean; status: number; err?: string }>,
): Promise<DispatchResult> {
  let lastStatus = 0;
  let lastErr: string | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const r = await fn();
    if (r.ok) return { channel, ok: true, attempts: attempt, status: r.status };
    lastStatus = r.status;
    lastErr = r.err;
    // 4xx (except 429) is terminal — don't retry, the request is wrong.
    if (r.status >= 400 && r.status < 500 && r.status !== 429) {
      return { channel, ok: false, attempts: attempt, status: r.status, err: r.err };
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((res) => setTimeout(res, BASE_BACKOFF_MS * 2 ** (attempt - 1)));
    }
  }
  return { channel, ok: false, attempts: MAX_ATTEMPTS, status: lastStatus, err: lastErr };
}

/**
 * Dispatch a single event to every channel the vault has registered.
 * Idempotent per (event_id, channel) within a 5-minute window.
 *
 * Workers note: this is invoked from the request handler (synchronously
 * awaiting before responding). For high-throughput v1.x, move to
 * `c.executionCtx.waitUntil(dispatch(...))` so the response is not held.
 */
export async function dispatchEvent(
  env: Env,
  vault: string,
  event: NotificationEvent,
): Promise<DispatchResult[]> {
  if (!env.REIN_KV) {
    logLine({ event: 'notify_skipped', reason: 'no KV', vault, type: event.type });
    return [];
  }
  const subs = await getSubscribers(env.REIN_KV, vault);
  const eid = eventId(event);
  const results: DispatchResult[] = [];

  if (subs.webhook?.url) {
    const channel: Channel = 'webhook';
    if (await alreadyDispatched(env.REIN_KV, eid, channel)) {
      results.push({ channel, ok: true, attempts: 0, status: 0, err: 'deduped' });
    } else {
      const r = await trySend(env, channel, () =>
        sendWebhook(subs.webhook!.url, event, subs.webhook!.secret),
      );
      if (r.ok) await markDispatched(env.REIN_KV, eid, channel);
      results.push(r);
    }
  }

  if (subs.telegram?.chatId && env.TELEGRAM_BOT_TOKEN) {
    const channel: Channel = 'telegram';
    if (await alreadyDispatched(env.REIN_KV, eid, channel)) {
      results.push({ channel, ok: true, attempts: 0, status: 0, err: 'deduped' });
    } else {
      const r = await trySend(env, channel, () =>
        sendTelegram(env.TELEGRAM_BOT_TOKEN!, subs.telegram!.chatId, event),
      );
      if (r.ok) await markDispatched(env.REIN_KV, eid, channel);
      results.push(r);
    }
  }

  logLine({
    event: 'notify_dispatched',
    vault,
    type: event.type,
    eid,
    results,
  });

  return results;
}
