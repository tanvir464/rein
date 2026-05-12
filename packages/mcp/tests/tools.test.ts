import { describe, it, expect } from 'vitest';
import type { Rein, Receipt, SpendResult } from '@rein/sdk';

import { handleSpend, type ToolResult } from '../src/tools/spend';
import { handleBalance } from '../src/tools/balance';
import { handleHistory } from '../src/tools/history';
import { handleRequestStepUp } from '../src/tools/step_up';

function fakeRein(over: Partial<Rein>): Rein {
  return over as Rein;
}

function parse(r: ToolResult): Record<string, unknown> {
  return JSON.parse(r.content[0]!.text);
}

describe('spend tool', () => {
  it('rejects when both url and recipient are present', async () => {
    const r = await handleSpend(
      fakeRein({} as Rein),
      { url: 'http://x', recipient: 'r', amount: '1' },
    );
    expect(r.isError).toBe(true);
    expect(parse(r)).toMatchObject({ ok: false, reason: 'ErrConfig' });
  });

  it('rejects when neither url nor recipient is present', async () => {
    const r = await handleSpend(fakeRein({} as Rein), {});
    expect(r.isError).toBe(true);
  });

  it('rejects bad max_amount for x402', async () => {
    const r = await handleSpend(fakeRein({} as Rein), { url: 'http://x', max_amount: 'abc' });
    expect(r.isError).toBe(true);
    expect(parse(r)).toMatchObject({ ok: false, reason: 'ErrConfig' });
  });

  it('rejects bad amount for transfer', async () => {
    const r = await handleSpend(fakeRein({} as Rein), { recipient: 'X', amount: 'NaN' });
    expect(r.isError).toBe(true);
  });

  it('returns ok payload on successful x402 spend', async () => {
    const ok: SpendResult = {
      ok: true,
      receiptId: 'R',
      signature: 'S',
      amount: 50_000n,
      recipient: 'PAY',
      content: { found: true },
      contentType: 'application/json',
      policyVersion: 7,
      confirmedAt: new Date('2026-05-03T00:00:00Z'),
    };
    let captured: unknown;
    const rein = fakeRein({
      spend: async (opts) => {
        captured = opts;
        return ok;
      },
    } as Partial<Rein> as Rein);
    const r = await handleSpend(rein, {
      url: 'http://api',
      max_amount: '50000',
    });
    expect(r.isError).toBeUndefined();
    expect(parse(r)).toMatchObject({
      ok: true,
      receipt_id: 'R',
      signature: 'S',
      amount: '50000',
      policy_version: 7,
      confirmed_at: '2026-05-03T00:00:00.000Z',
    });
    expect(captured).toMatchObject({ kind: 'x402', url: 'http://api', maxAmount: 50000n });
  });

  it('returns structured error on policy reject (not throw)', async () => {
    const fail: SpendResult = {
      ok: false,
      reason: 'ErrPerTxCap',
      stage: 'simulate',
    };
    const rein = fakeRein({
      spend: async () => fail,
    } as Partial<Rein> as Rein);
    const r = await handleSpend(rein, { recipient: 'R', amount: '999999' });
    expect(r.isError).toBe(true);
    expect(parse(r)).toMatchObject({ ok: false, reason: 'ErrPerTxCap', stage: 'simulate' });
  });
});

describe('balance tool', () => {
  it('returns ISO date + stringified bigints', async () => {
    const rein = fakeRein({
      balance: async () => ({
        usdc: 1_000_000n,
        sol: 1_000_000_000n,
        updatedAt: new Date('2026-05-03T00:00:00Z'),
      }),
    } as Partial<Rein> as Rein);
    const r = await handleBalance(rein);
    expect(r.isError).toBeUndefined();
    expect(parse(r)).toEqual({
      usdc: '1000000',
      sol: '1000000000',
      updated_at: '2026-05-03T00:00:00.000Z',
    });
  });
});

describe('history tool', () => {
  function mkReceipt(): Receipt {
    return {
      id: 'PDA',
      signature: 'SIG',
      vault: 'V',
      amount: 100n,
      recipient: 'R',
      ts: new Date('2026-05-03T00:00:00Z'),
      policyVersion: 1,
      nonce: 7n,
      disputed: false,
    };
  }

  it('returns receipts list with bigints stringified', async () => {
    const rein = fakeRein({
      history: async () => [mkReceipt()],
    } as Partial<Rein> as Rein);
    const r = await handleHistory(rein, {});
    const body = parse(r);
    expect(body['receipts']).toHaveLength(1);
    const receipt = (body['receipts'] as { id: string; amount: string }[])[0]!;
    expect(receipt['amount']).toBe('100');
    expect(receipt['id']).toBe('PDA');
  });

  it('rejects malformed before', async () => {
    const rein = fakeRein({
      history: async () => [],
    } as Partial<Rein> as Rein);
    const r = await handleHistory(rein, { before: 'not-a-date' });
    expect(r.isError).toBe(true);
  });
});

describe('request_step_up tool', () => {
  it('rejects bad amount', async () => {
    const rein = fakeRein({} as Rein);
    const r = await handleRequestStepUp(rein, { amount: 'oops', recipient: 'R' });
    expect(r.isError).toBe(true);
  });

  it('rejects missing recipient', async () => {
    const rein = fakeRein({} as Rein);
    const r = await handleRequestStepUp(rein, { amount: '100' });
    expect(r.isError).toBe(true);
  });

  it('returns ok payload on success', async () => {
    const rein = fakeRein({
      requestStepUp: async () => ({
        requestPda: 'P',
        expiresAt: new Date('2026-05-03T00:05:00Z'),
        signature: 'S',
      }),
    } as Partial<Rein> as Rein);
    const r = await handleRequestStepUp(rein, { amount: '2000000', recipient: 'R' });
    expect(r.isError).toBeUndefined();
    expect(parse(r)).toMatchObject({
      ok: true,
      request_pda: 'P',
      signature: 'S',
      expires_at: '2026-05-03T00:05:00.000Z',
    });
  });

  it('catches thrown errors and returns structured failure', async () => {
    const rein = fakeRein({
      requestStepUp: async () => {
        const e = new Error('disposed') as Error & { code: string };
        e.code = 'ErrConfig';
        throw e;
      },
    } as Partial<Rein> as Rein);
    const r = await handleRequestStepUp(rein, { amount: '2000000', recipient: 'R' });
    expect(r.isError).toBe(true);
    expect(parse(r)).toMatchObject({ ok: false, reason: 'ErrConfig' });
  });
});
