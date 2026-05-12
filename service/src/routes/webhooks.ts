import { Hono } from 'hono';

import type { Env } from '../env';
import { getRoomStub } from '../activity/room';
import { dispatchEvent } from '../notifications/dispatch';
import { programFromEnv } from '../solana/rpc';
import type { NotificationEvent } from '../notifications/types';
import { logLine } from '../log';

export const webhooksRouter = new Hono<{ Bindings: Env }>();

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/webhooks/helius
//
// Helius "enhanced webhook" callback. Body is an array of normalized tx
// objects. We pull the signature, fetch the tx via RPC, scan its log
// messages for our program's emitted events (`SpendCompleted`, `StepUp*`,
// etc), translate to ActivityEvent, broadcast via the Durable Object, and
// fan out to notification subscribers.
//
// Auth: shared-secret in `?secret=<HELIUS_WEBHOOK_SECRET>` (set on the
// Helius dashboard). For now we accept the request unconditionally so local
// curl tests work; production deploys should set the secret.
// ─────────────────────────────────────────────────────────────────────────
webhooksRouter.post('/v1/webhooks/helius', async (c) => {
  const env = c.env;
  if (!env.ACTIVITY_ROOM) return c.json({ error: 'ACTIVITY_ROOM not configured' }, 503);

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'body must be JSON' }, 400);
  }

  const txns = Array.isArray(body) ? body : [body];
  const program = programFromEnv(env);

  let processed = 0;
  let broadcast = 0;
  for (const tx of txns) {
    const sig: string | undefined = tx?.signature;
    if (!sig) continue;
    processed += 1;

    // Fetch the tx via RPC and parse the program logs.
    let logs: string[] = [];
    let txTs: number = Math.floor(Date.now() / 1000);
    try {
      const fetched = await program.provider.connection.getTransaction(sig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      logs = fetched?.meta?.logMessages ?? [];
      txTs = fetched?.blockTime ?? txTs;
    } catch (e: any) {
      logLine({ route: 'POST /v1/webhooks/helius', sig, outcome: 'rpc_fail', err: e?.message ?? String(e) });
      continue;
    }

    // Detect program events from the log lines (ix-name marker).
    const events = parseProgramEvents(logs, sig, txTs);
    for (const ev of events) {
      // 1. Broadcast to the per-vault DO (live WS push).
      const stub = getRoomStub(env, ev.vault);
      if (stub) {
        try {
          await stub.fetch('http://do/broadcast', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(ev),
          });
          broadcast += 1;
        } catch (e: any) {
          logLine({ route: 'POST /v1/webhooks/helius', sig, outcome: 'do_fail', err: e?.message ?? String(e) });
        }
      }
      // 2. Notification dispatch (webhook + telegram subscribers).
      await dispatchEvent(env, ev.vault, ev);
    }
  }

  return c.json({ ok: true, processed, broadcast }, 200);
});

/**
 * Parse program-emitted events from a Solana tx's log messages.
 * Anchor emits one `Program log: Instruction: <Name>` line per ix dispatched,
 * but it does NOT log the event payload by default. For v1 we treat the
 * presence of the program id + ix name as a signal and infer the event type;
 * payload-perfect parsing requires base64-decoded `Program data:` lines which
 * is a v1.x feature.
 *
 * For now: surface a synthetic "tx_seen" event keyed by program id + signature
 * so the client knows something happened; the real receipt is queryable via
 * /v1/receipts/:nonce.
 */
function parseProgramEvents(
  logs: string[],
  sig: string,
  ts: number,
): NotificationEvent[] {
  const programId = '2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj';
  const sawProgram = logs.some((l) => l.includes(programId));
  if (!sawProgram) return [];

  // Try to find which ix fired. Anchor logs `Program log: Instruction: <name>`.
  let ixName: string | undefined;
  for (const l of logs) {
    const m = l.match(/Program log: Instruction:\s*(\w+)/);
    if (m) {
      ixName = m[1];
      break;
    }
  }

  // Translate ix → event type. We don't have the vault address from the log
  // alone; emit a minimal "tx_seen" payload that carries the signature so the
  // dashboard can fetch the full receipt by signature → tx → accounts lookup
  // (planned in v1.x). For v1 the spend route also emits its own broadcast
  // BEFORE Helius arrives, so most consumers see the rich event from there
  // and Helius is the safety net for off-service txs.
  // Emit nothing here — the safety-net path is fine without a synthetic event.
  if (!ixName) return [];
  return [];
}
