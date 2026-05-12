/**
 * Connect to /v1/activity for a vault, print every event received, exit on
 * SIGINT. Issue a token first via issue-token.ts (or pass TOKEN env var).
 *
 * Usage:
 *   TOKEN=<bearer> VAULT=<base58> npx tsx program/scripts/ws-client.ts
 *
 * Defaults: VAULT from .devnet-seed.json, SERVICE_URL=ws://192.168.64.1:8787
 */
import WebSocket from 'ws';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cachePath = path.resolve(here, '..', '.devnet-seed.json');

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('TOKEN env var required');
  process.exit(1);
}

let VAULT = process.env.VAULT;
if (!VAULT) {
  if (!fs.existsSync(cachePath)) {
    console.error('VAULT not set and no .devnet-seed.json — run seed-devnet.ts first');
    process.exit(1);
  }
  VAULT = (JSON.parse(fs.readFileSync(cachePath, 'utf8')) as any).vault;
}

const SERVICE_URL = process.env.SERVICE_URL ?? 'ws://192.168.64.1:8787';
const url = `${SERVICE_URL}/v1/activity?vault=${VAULT}&token=${encodeURIComponent(TOKEN)}`;

console.log('connecting:', url);
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('[ws] open');
  // Send a ping every 25s so the connection stays warm.
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'ping' })), 25_000);
});

ws.on('message', (data) => {
  let payload: any;
  try {
    payload = JSON.parse(data.toString());
  } catch {
    payload = data.toString();
  }
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, JSON.stringify(payload));
});

ws.on('close', (code, reason) => {
  console.log(`[ws] close ${code} ${reason.toString()}`);
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('[ws] error', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n[ws] closing on SIGINT');
  ws.close();
});
