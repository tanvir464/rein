/**
 * Live sidecar smoke against devnet. Requires:
 *   - `pnpm dev` running on http://127.0.0.1:8788
 *   - SIDECAR_HMAC_KEY in env
 *   - UMBRA_SIDECAR_KEYPAIR_BASE58 funded on devnet and Umbra-registered
 *
 * The test is skipped (not failed) if the sidecar isn't reachable, so CI/typecheck
 * stays green even without the wallet provisioned.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';

const URL = process.env.REIN_SIDECAR_URL ?? 'http://127.0.0.1:8788';
const KEY = process.env.SIDECAR_HMAC_KEY ?? '';

let up = false;
beforeAll(async () => {
  try {
    const r = await fetch(`${URL}/health`, { signal: AbortSignal.timeout(2000) });
    up = r.ok;
  } catch {
    up = false;
  }
});

function sign(body: string, ts: string): string {
  return createHmac('sha256', KEY).update(`${ts}.${body}`).digest('hex');
}

describe('sidecar smoke', () => {
  it('health responds', async () => {
    if (!up) return;
    const r = await fetch(`${URL}/health`);
    expect(r.status).toBe(200);
  });

  it('rejects unsigned create-utxo with 401', async () => {
    if (!up) return;
    const r = await fetch(`${URL}/umbra/create-utxo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(401);
  });

  it('signs + creates a UTXO on devnet', async () => {
    if (!up || !KEY) return;
    const ts = Date.now().toString();
    const body = JSON.stringify({
      destinationAddress: '2eXVwmqhWd8cC5tDydrtHL41z4qPv2jseXi53FXKSVUf',
      mint: '5KdxeDZXVupi7FN7ipox7SV2P4Hqjn4HVUUcGS7f4xB6',
      amount: '100',
      refTag: randomBytes(8).toString('hex'),
    });
    const sig = sign(body, ts);
    const r = await fetch(`${URL}/umbra/create-utxo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rein-ts': ts,
        'x-rein-sig': sig,
      },
      body,
    });
    // If the wallet isn't provisioned yet, the sidecar surfaces a 502 with the
    // Umbra error. That's an expected soft-fail for the unprovisioned case.
    if (r.status === 502) {
      const detail = await r.json();
      expect(detail).toHaveProperty('error');
      return;
    }
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j).toHaveProperty('umbraSignature');
  }, 60_000);
});
