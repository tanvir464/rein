import { describe, it, expect } from 'vitest';
import type { Rein } from '@rein/sdk';

import { reinFunctionDefs, dispatchReinToolCall } from '../src';

function fakeRein(over: Partial<Rein>): Rein {
  return over as Rein;
}

describe('reinFunctionDefs', () => {
  it('exposes exactly four functions with canonical names', () => {
    const names = reinFunctionDefs.map((d) => d.function.name);
    expect(names).toEqual([
      'rein_spend',
      'rein_balance',
      'rein_history',
      'rein_request_step_up',
    ]);
  });

  it('every entry is the OpenAI tools shape', () => {
    for (const d of reinFunctionDefs) {
      expect(d.type).toBe('function');
      expect(typeof d.function.name).toBe('string');
      expect(typeof d.function.description).toBe('string');
      expect(d.function.parameters).toMatchObject({ type: 'object' });
    }
  });

  it('parameters do not include $schema (OpenAI rejects)', () => {
    for (const d of reinFunctionDefs) {
      expect(d.function.parameters).not.toHaveProperty('$schema');
    }
  });
});

describe('dispatchReinToolCall', () => {
  it('routes balance', async () => {
    const rein = fakeRein({
      balance: async () => ({
        usdc: 1n,
        sol: 2n,
        updatedAt: new Date('2026-05-03T00:00:00Z'),
      }),
    } as Partial<Rein> as Rein);
    const r = (await dispatchReinToolCall(rein, 'rein_balance', {})) as { updated_at: string };
    expect(r.updated_at).toBe('2026-05-03T00:00:00.000Z');
  });

  it('rejects spend with both url and recipient', async () => {
    const rein = fakeRein({} as Rein);
    const r = (await dispatchReinToolCall(rein, 'rein_spend', {
      url: 'http://x',
      recipient: 'R',
      amount: '1',
    })) as { ok: boolean };
    expect(r.ok).toBe(false);
  });

  it('forwards spend amount as bigint', async () => {
    let captured: unknown;
    const rein = fakeRein({
      spend: async (opts) => {
        captured = opts;
        return {
          ok: true,
          receiptId: 'R',
          signature: 'S',
          amount: 12345n,
          recipient: 'P',
          policyVersion: 1,
          confirmedAt: new Date('2026-05-03T00:00:00Z'),
        };
      },
    } as Partial<Rein> as Rein);
    await dispatchReinToolCall(rein, 'rein_spend', { recipient: 'P', amount: '12345' });
    expect(captured).toMatchObject({ kind: 'transfer', amount: 12345n });
  });
});
