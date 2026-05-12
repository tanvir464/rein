/**
 * Per-vault Durable Object holding live WebSocket sessions + a 5-min in-memory
 * ring buffer for replay-on-reconnect. Routes:
 *   GET  /connect?since=<unix_secs>  — WebSocket upgrade
 *   POST /broadcast                  — body: ActivityEvent
 *   POST /heartbeat-tick             — server sends ping to every session
 *   GET  /sessions                   — diagnostics
 */

import type { Env } from '../env';
import type { NotificationEvent } from '../notifications/types';

export type ActivityEvent = NotificationEvent;

const RING_MAX = 200;
const RING_WINDOW_SECS = 300;

export class ActivityRoom {
  state: DurableObjectState;
  env: Env;
  sessions: Set<WebSocket>;
  buffer: ActivityEvent[];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
    this.buffer = [];
  }

  pruneBuffer(now: number) {
    const cutoff = now - RING_WINDOW_SECS;
    while (this.buffer.length > 0 && this.buffer[0]!.ts < cutoff) this.buffer.shift();
    while (this.buffer.length > RING_MAX) this.buffer.shift();
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/connect' && req.headers.get('Upgrade') === 'websocket') {
      const since = parseInt(url.searchParams.get('since') ?? '0', 10);
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      this.sessions.add(server);

      // Replay buffered events newer than `since` (or send the last 20 if since=0).
      const now = Math.floor(Date.now() / 1000);
      this.pruneBuffer(now);
      const replay = since > 0
        ? this.buffer.filter((e) => e.ts >= since)
        : this.buffer.slice(-20);
      try {
        server.send(JSON.stringify({ type: 'hello', sessionCount: this.sessions.size, replayCount: replay.length, ts: now }));
        for (const ev of replay) server.send(JSON.stringify(ev));
      } catch {
        // session may have closed mid-replay; ignore
      }

      const cleanup = () => this.sessions.delete(server);
      server.addEventListener('close', cleanup);
      server.addEventListener('error', cleanup);
      // Echo client pings back as heartbeat so they can verify liveness.
      server.addEventListener('message', (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
          if (msg?.type === 'ping') {
            server.send(JSON.stringify({ type: 'pong', ts: Date.now() / 1000 }));
          }
        } catch {
          // ignore
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/broadcast' && req.method === 'POST') {
      const ev = (await req.json()) as ActivityEvent;
      this.buffer.push(ev);
      const now = Math.floor(Date.now() / 1000);
      this.pruneBuffer(now);
      const json = JSON.stringify(ev);
      let delivered = 0;
      for (const ws of this.sessions) {
        try {
          ws.send(json);
          delivered += 1;
        } catch {
          this.sessions.delete(ws);
        }
      }
      return Response.json({ ok: true, delivered, sessions: this.sessions.size });
    }

    if (url.pathname === '/sessions') {
      return Response.json({ sessions: this.sessions.size, buffered: this.buffer.length });
    }

    return new Response('not found', { status: 404 });
  }
}

/** Helper: get the DO stub for a given vault. */
export function getRoomStub(env: Env, vault: string): DurableObjectStub | null {
  if (!env.ACTIVITY_ROOM) return null;
  const id = env.ACTIVITY_ROOM.idFromName(vault);
  return env.ACTIVITY_ROOM.get(id);
}
