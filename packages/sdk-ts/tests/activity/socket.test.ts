import { describe, it, expect } from 'vitest';
import { decodeEvent } from '../../src';

describe('decodeEvent', () => {
  it('decodes hello', () => {
    const e = decodeEvent({ type: 'hello', vault: 'V', ts: 100 });
    expect(e?.type).toBe('hello');
    if (e?.type === 'hello') {
      expect(e.vault).toBe('V');
      expect(e.ts.getTime()).toBe(100_000);
    }
  });

  it('decodes pong', () => {
    const e = decodeEvent({ type: 'pong', ts: 50 });
    expect(e?.type).toBe('pong');
  });

  it('decodes spend.completed (bigint amount)', () => {
    const e = decodeEvent({
      type: 'spend.completed',
      vault: 'V',
      receiptPda: 'P',
      signature: 'S',
      amount: '12345',
      recipient: 'R',
      policyVersion: 3,
      ts: 1700000000,
    });
    expect(e?.type).toBe('spend.completed');
    if (e?.type === 'spend.completed') {
      expect(e.amount).toBe(12345n);
      expect(e.policyVersion).toBe(3);
      expect(e.receiptPda).toBe('P');
    }
  });

  it('decodes spend.rejected', () => {
    const e = decodeEvent({
      type: 'spend.rejected',
      vault: 'V',
      stage: 'simulate',
      reason: 'ErrPerTxCap',
      amount: '600000',
      ts: 1,
    });
    expect(e?.type).toBe('spend.rejected');
    if (e?.type === 'spend.rejected') {
      expect(e.reason).toBe('ErrPerTxCap');
      expect(e.amount).toBe(600_000n);
      expect(e.stage).toBe('simulate');
    }
  });

  it('decodes step_up.requested', () => {
    const e = decodeEvent({
      type: 'step_up.requested',
      vault: 'V',
      requestPda: 'R',
      amount: '2000000',
      recipient: 'X',
      nonce: '42',
      expiresAt: 1700000300,
      ts: 1700000000,
    });
    expect(e?.type).toBe('step_up.requested');
    if (e?.type === 'step_up.requested') {
      expect(e.amount).toBe(2_000_000n);
      expect(e.nonce).toBe(42n);
      expect(e.expiresAt.getTime()).toBe(1700000300_000);
    }
  });

  it('decodes step_up.approved', () => {
    const e = decodeEvent({
      type: 'step_up.approved',
      vault: 'V',
      requestPda: 'R',
      ts: 1,
    });
    expect(e?.type).toBe('step_up.approved');
  });

  it('returns null on unknown type', () => {
    expect(decodeEvent({ type: 'who.knows' })).toBeNull();
  });

  it('returns null on non-object input', () => {
    expect(decodeEvent(null)).toBeNull();
    expect(decodeEvent('string')).toBeNull();
    expect(decodeEvent(42)).toBeNull();
  });
});
