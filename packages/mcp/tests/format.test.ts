import { describe, it, expect } from 'vitest';
import { jsonSafe, snake } from '../src/format';

describe('jsonSafe', () => {
  it('serializes bigint as decimal string', () => {
    expect(jsonSafe(123n)).toBe('123');
    expect(jsonSafe(0n)).toBe('0');
  });

  it('serializes Date as ISO string', () => {
    const d = new Date('2026-05-03T00:00:00.000Z');
    expect(jsonSafe(d)).toBe('2026-05-03T00:00:00.000Z');
  });

  it('snake-cases object keys recursively', () => {
    const out = jsonSafe({
      receiptId: 'X',
      policyVersion: 1,
      nested: { confirmedAt: new Date('2026-05-03T00:00:00Z'), camelCase: true },
    });
    expect(out).toEqual({
      receipt_id: 'X',
      policy_version: 1,
      nested: { confirmed_at: '2026-05-03T00:00:00.000Z', camel_case: true },
    });
  });

  it('walks arrays', () => {
    expect(jsonSafe([1n, 2n, 3n])).toEqual(['1', '2', '3']);
  });

  it('passes primitives through', () => {
    expect(jsonSafe('s')).toBe('s');
    expect(jsonSafe(42)).toBe(42);
    expect(jsonSafe(true)).toBe(true);
    expect(jsonSafe(null)).toBe(null);
    expect(jsonSafe(undefined)).toBe(undefined);
  });
});

describe('snake', () => {
  it('converts camelCase', () => {
    expect(snake('receiptId')).toBe('receipt_id');
    expect(snake('confirmedAt')).toBe('confirmed_at');
    expect(snake('a')).toBe('a');
  });
});
