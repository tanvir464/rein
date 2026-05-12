import { describe, it, expect } from 'vitest';
import type { Rein, SpendResult } from '@rein/sdk';

import { createReinTools, REIN_TOOL_NAMES } from '../src';

function fakeRein(over: Partial<Rein>): Rein {
  return over as Rein;
}

describe('createReinTools', () => {
  it('returns four tools with canonical names', () => {
    const rein = fakeRein({} as Rein);
    const tools = createReinTools(rein);
    const names = tools.map((t) => t.name);
    expect(names).toEqual([...REIN_TOOL_NAMES]);
  });

  it('spend tool: rejects ambiguous url+recipient', async () => {
    const rein = fakeRein({} as Rein);
    const tools = createReinTools(rein);
    const spend = tools.find((t) => t.name === 'rein_spend')!;
    const r = await spend.invoke({ url: 'http://x', recipient: 'r', amount: '1' });
    const body = JSON.parse(r as string) as { ok: boolean; reason: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('ErrConfig');
  });

  it('spend tool: returns JSON success for transfer', async () => {
    const ok: SpendResult = {
      ok: true,
      receiptId: 'R',
      signature: 'S',
      amount: 100n,
      recipient: 'P',
      policyVersion: 1,
      confirmedAt: new Date('2026-05-03T00:00:00Z'),
    };
    const rein = fakeRein({ spend: async () => ok } as Partial<Rein> as Rein);
    const tools = createReinTools(rein);
    const spend = tools.find((t) => t.name === 'rein_spend')!;
    const out = await spend.invoke({ recipient: 'X', amount: '100' });
    const body = JSON.parse(out as string) as { ok: true; amount: string; receipt_id: string };
    expect(body.ok).toBe(true);
    expect(body.amount).toBe('100');
    expect(body.receipt_id).toBe('R');
  });

  it('balance tool: snake-cases response', async () => {
    const rein = fakeRein({
      balance: async () => ({
        usdc: 1n,
        sol: 2n,
        updatedAt: new Date('2026-05-03T00:00:00Z'),
      }),
    } as Partial<Rein> as Rein);
    const tools = createReinTools(rein);
    const balance = tools.find((t) => t.name === 'rein_balance')!;
    const out = await balance.invoke({});
    const body = JSON.parse(out as string) as { updated_at: string };
    expect(body.updated_at).toBe('2026-05-03T00:00:00.000Z');
  });

  it('history tool: rejects malformed before', async () => {
    const rein = fakeRein({ history: async () => [] } as Partial<Rein> as Rein);
    const tools = createReinTools(rein);
    const history = tools.find((t) => t.name === 'rein_history')!;
    const out = await history.invoke({ before: 'not-a-date' });
    const body = JSON.parse(out as string) as { ok: boolean };
    expect(body.ok).toBe(false);
  });
});
