import { describe, it, expect } from 'vitest';
import type { Rein } from '@rein/sdk';

import { reinTools, REIN_TOOL_NAMES } from '../src';

function fakeRein(over: Partial<Rein>): Rein {
  return over as Rein;
}

describe('reinTools', () => {
  it('returns all four tools', () => {
    const tools = reinTools(fakeRein({} as Rein));
    const keys = Object.keys(tools).sort();
    expect(keys).toEqual([...REIN_TOOL_NAMES].sort());
  });

  it('balance: returns ISO-formatted updated_at', async () => {
    const tools = reinTools(
      fakeRein({
        balance: async () => ({
          usdc: 1n,
          sol: 2n,
          updatedAt: new Date('2026-05-03T00:00:00Z'),
        }),
      } as Partial<Rein> as Rein),
    );
    const r = (await tools.rein_balance.execute!(
      {},
      { messages: [], toolCallId: 't', abortSignal: undefined },
    )) as { updated_at: string };
    expect(r.updated_at).toBe('2026-05-03T00:00:00.000Z');
  });

  it('spend: rejects ambiguous args', async () => {
    const tools = reinTools(fakeRein({} as Rein));
    const r = (await tools.rein_spend.execute!(
      { url: 'http://x', recipient: 'R', amount: '1' },
      { messages: [], toolCallId: 't', abortSignal: undefined },
    )) as { ok: boolean };
    expect(r.ok).toBe(false);
  });
});
