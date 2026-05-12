import type { ActivityEvent, Logger, SubscribeOpts, Unsubscribe } from '../types';

export type ActivitySocketOpts = {
  serviceUrl: string;
  vault: string;
  /** Bearer raw token; appended as `?token=…` on the WS upgrade URL. */
  token: string;
  /** Replay events newer than this. */
  since?: Date;
  /** Pluggable WebSocket constructor (Node test env) — defaults to globalThis.WebSocket. */
  WebSocketCtor?: typeof WebSocket;
  logger?: Logger;
};

const HEARTBEAT_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 35_000;
const MAX_BUFFER = 100;
const BACKOFF_STEPS_MS = [250, 500, 1_000, 2_000, 5_000, 10_000, 30_000];

/**
 * WebSocket subscription to `GET /v1/activity` with reconnect, replay-since,
 * heartbeat, and bounded backpressure (drops oldest beyond 100 events).
 *
 * Lifecycle:
 *   - connect() opens a socket; reconnects on any close until `dispose()` is
 *     called or `signal.aborted`.
 *   - on every reconnect, sends `since=<lastEventTs>` so the server's DO can
 *     replay missed events from its 5-min buffer.
 *   - heartbeat: server pings every ~30s; if no message arrives within 35s
 *     the socket is treated as dead and reconnected.
 *   - backpressure: if the consumer falls behind, queue up to 100 events;
 *     beyond that, drop oldest with a `dropped` log warning.
 */
export function openActivitySocket(
  opts: ActivitySocketOpts,
  handler: (event: ActivityEvent) => void,
  subOpts: SubscribeOpts = {},
): Unsubscribe {
  const log = opts.logger;
  const wsCtor = opts.WebSocketCtor ?? (globalThis.WebSocket as typeof WebSocket | undefined);
  if (!wsCtor) {
    throw new Error(
      'WebSocket is not available; pass `WebSocketCtor` (e.g. from `ws` in Node).',
    );
  }
  const WS: typeof WebSocket = wsCtor;

  const buffer: ActivityEvent[] = [];
  let draining = false;
  let dropped = 0;

  let socket: WebSocket | null = null;
  let lastEventTs: number = subOpts.since
    ? Math.floor(subOpts.since.getTime() / 1000)
    : 0;
  let backoffStep = 0;
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const onAbort = () => {
    closed = true;
    teardown();
  };
  if (subOpts.signal) {
    if (subOpts.signal.aborted) onAbort();
    else subOpts.signal.addEventListener('abort', onAbort);
  }

  function buildUrl(): string {
    const base = opts.serviceUrl.replace(/^http/, 'ws');
    const u = new URL('/v1/activity', base);
    u.searchParams.set('vault', opts.vault);
    u.searchParams.set('token', opts.token);
    if (lastEventTs > 0) u.searchParams.set('since', String(lastEventTs));
    return u.toString();
  }

  function pumpBuffer(): void {
    if (draining) return;
    draining = true;
    queueMicrotask(async () => {
      try {
        while (buffer.length > 0) {
          const ev = buffer.shift();
          if (!ev) break;
          try {
            handler(ev);
          } catch (e) {
            subOpts.onError?.(e);
          }
        }
      } finally {
        draining = false;
      }
    });
  }

  function pushEvent(ev: ActivityEvent): void {
    if (buffer.length >= MAX_BUFFER) {
      buffer.shift();
      dropped++;
      if (dropped === 1 || dropped % 50 === 0) {
        log?.warn(`rein.activity: dropped ${dropped} events (consumer lagging)`);
      }
    }
    buffer.push(ev);
    pumpBuffer();
  }

  function resetHeartbeat(): void {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      log?.debug('rein.activity: heartbeat timeout, reconnecting');
      try {
        socket?.close();
      } catch {
        // ignore
      }
    }, HEARTBEAT_TIMEOUT_MS);
  }

  function scheduleReconnect(): void {
    if (closed) return;
    const delay =
      BACKOFF_STEPS_MS[Math.min(backoffStep, BACKOFF_STEPS_MS.length - 1)] ?? 30_000;
    backoffStep++;
    const jittered = Math.round(delay * (0.8 + Math.random() * 0.4));
    log?.debug(`rein.activity: reconnect in ${jittered}ms`);
    reconnectTimer = setTimeout(connect, jittered);
  }

  function connect(): void {
    if (closed) return;
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = null;
    }
    let ws: WebSocket;
    try {
      ws = new WS(buildUrl());
    } catch (e) {
      subOpts.onError?.(e);
      scheduleReconnect();
      return;
    }
    socket = ws;
    resetHeartbeat();
    ws.addEventListener('open', () => {
      log?.debug('rein.activity: open');
      backoffStep = 0;
    });
    ws.addEventListener('message', (msgEvent: MessageEvent) => {
      resetHeartbeat();
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof msgEvent.data === 'string' ? msgEvent.data : '');
      } catch {
        return;
      }
      const ev = decodeEvent(parsed);
      if (!ev) return;
      const ts =
        ev.ts instanceof Date && !Number.isNaN(ev.ts.getTime())
          ? Math.floor(ev.ts.getTime() / 1000)
          : 0;
      if (ts > lastEventTs) lastEventTs = ts;
      pushEvent(ev);
    });
    ws.addEventListener('close', () => {
      log?.debug('rein.activity: close');
      if (heartbeatTimer) {
        clearTimeout(heartbeatTimer);
        heartbeatTimer = null;
      }
      socket = null;
      subOpts.onClose?.();
      scheduleReconnect();
    });
    ws.addEventListener('error', (errEvent: unknown) => {
      log?.debug('rein.activity: error', errEvent);
      subOpts.onError?.(errEvent);
    });
  }

  function teardown(): void {
    closed = true;
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    heartbeatTimer = null;
    reconnectTimer = null;
    try {
      socket?.close();
    } catch {
      // ignore
    }
    socket = null;
    if (subOpts.signal) subOpts.signal.removeEventListener('abort', onAbort);
  }

  connect();
  return () => teardown();
}

/** Convert a server-side event JSON into the client `ActivityEvent` shape. */
export function decodeEvent(raw: unknown): ActivityEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const type = o['type'];
  const tsSec = typeof o['ts'] === 'number' ? o['ts'] : 0;
  const ts = new Date(tsSec * 1000);

  switch (type) {
    case 'hello':
      return {
        type: 'hello',
        vault: String(o['vault'] ?? ''),
        ts,
      };
    case 'pong':
      return { type: 'pong', ts };
    case 'spend.completed':
      return {
        type: 'spend.completed',
        vault: String(o['vault'] ?? ''),
        receiptPda: String(o['receiptPda'] ?? ''),
        signature: String(o['signature'] ?? ''),
        amount: BigInt(String(o['amount'] ?? '0')),
        recipient: String(o['recipient'] ?? ''),
        policyVersion: Number(o['policyVersion'] ?? 0),
        ts,
      };
    case 'spend.rejected':
      return {
        type: 'spend.rejected',
        vault: String(o['vault'] ?? ''),
        stage: o['stage'] ? String(o['stage']) : undefined,
        reason: String(o['reason'] ?? ''),
        amount: o['amount'] ? BigInt(String(o['amount'])) : undefined,
        recipient: o['recipient'] ? String(o['recipient']) : undefined,
        ts,
      };
    case 'step_up.requested':
      return {
        type: 'step_up.requested',
        vault: String(o['vault'] ?? ''),
        requestPda: String(o['requestPda'] ?? ''),
        amount: BigInt(String(o['amount'] ?? '0')),
        recipient: String(o['recipient'] ?? ''),
        nonce: BigInt(String(o['nonce'] ?? '0')),
        expiresAt: new Date(Number(o['expiresAt'] ?? 0) * 1000),
        ts,
      };
    case 'step_up.approved':
      return {
        type: 'step_up.approved',
        vault: String(o['vault'] ?? ''),
        requestPda: String(o['requestPda'] ?? ''),
        ts,
      };
    default:
      return null;
  }
}
