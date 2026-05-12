import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { createUtxo, healthCheck } from './umbra.js';

const PORT = Number(process.env.PORT ?? 8788);
const HMAC_KEY = process.env.SIDECAR_HMAC_KEY ?? '';
const MAX_SKEW_MS = 60_000;

if (!HMAC_KEY) {
  console.error('[sidecar] SIDECAR_HMAC_KEY is required (see .env.example)');
  process.exit(1);
}

const app = new Hono();

app.get('/health', async (c) => {
  const u = await healthCheck();
  return c.json({ ok: true, service: 'rein-sidecar', umbra: u });
});

app.post('/umbra/create-utxo', async (c) => {
  const sigHeader = c.req.header('x-rein-sig') ?? '';
  const tsHeader = c.req.header('x-rein-ts') ?? '';
  if (!sigHeader || !tsHeader) {
    return c.json({ error: 'missing x-rein-sig or x-rein-ts' }, 401);
  }
  const ts = Number(tsHeader);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
    return c.json({ error: 'timestamp skew too large' }, 401);
  }
  const rawBody = await c.req.text();
  const expected = createHmac('sha256', HMAC_KEY).update(`${tsHeader}.${rawBody}`).digest('hex');
  let bytesA: Buffer;
  let bytesB: Buffer;
  try {
    bytesA = Buffer.from(sigHeader, 'hex');
    bytesB = Buffer.from(expected, 'hex');
  } catch {
    return c.json({ error: 'malformed signature' }, 401);
  }
  if (bytesA.length !== bytesB.length || !timingSafeEqual(bytesA, bytesB)) {
    return c.json({ error: 'bad signature' }, 401);
  }

  let input: any;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'malformed JSON' }, 400);
  }
  const { destinationAddress, mint, amount, refTag } = input ?? {};
  if (!destinationAddress || !mint || !amount || !refTag) {
    return c.json({ error: 'destinationAddress, mint, amount, refTag required' }, 400);
  }

  try {
    const r = await createUtxo({ destinationAddress, mint, amount, refTag });
    return c.json(r, 200);
  } catch (e: any) {
    console.error('[sidecar] create-utxo failed:', e?.message ?? e);
    return c.json({ error: 'umbra create-utxo failed', detail: e?.message ?? String(e) }, 502);
  }
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[sidecar] listening on http://127.0.0.1:${info.port}`);
});
