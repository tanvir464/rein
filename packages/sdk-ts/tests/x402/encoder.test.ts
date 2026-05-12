import { describe, it, expect } from 'vitest';
import { encodePaymentHeader, type Requirement } from '../../src';

function req(): Requirement {
  return {
    facilitator: 'coinbase',
    scheme: 'exact',
    network: 'solana-devnet',
    asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    amount: 10_000n,
    recipient: 'A',
    raw: {},
  };
}

function decodeB64u(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof globalThis.atob === 'function') {
    const bin = globalThis.atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  return Buffer.from(padded, 'base64').toString('utf-8');
}

describe('encodePaymentHeader', () => {
  it('produces a valid base64url JSON envelope', () => {
    const h = encodePaymentHeader({
      requirement: req(),
      signature: 'SIGN',
      receiptPda: 'PDA',
    });
    expect(h).not.toContain('=');
    expect(h).not.toContain('+');
    expect(h).not.toContain('/');
    const parsed = JSON.parse(decodeB64u(h)) as Record<string, unknown>;
    expect(parsed['scheme']).toBe('exact');
    expect(parsed['network']).toBe('solana-devnet');
    const payload = parsed['payload'] as Record<string, unknown>;
    expect(payload['signature']).toBe('SIGN');
    expect(payload['receiptPda']).toBe('PDA');
  });

  it('includes optional transactionBase58 when supplied', () => {
    const h = encodePaymentHeader({
      requirement: req(),
      signature: 'SIGN',
      transactionBase58: 'TX',
    });
    const parsed = JSON.parse(decodeB64u(h)) as Record<string, unknown>;
    const payload = parsed['payload'] as Record<string, unknown>;
    expect(payload['transaction']).toBe('TX');
    expect(payload['receiptPda']).toBeUndefined();
  });

  it('passes through extra payload fields', () => {
    const h = encodePaymentHeader({
      requirement: req(),
      signature: 'S',
      extra: { facilitatorHint: 'payai' },
    });
    const parsed = JSON.parse(decodeB64u(h)) as Record<string, unknown>;
    const payload = parsed['payload'] as Record<string, unknown>;
    expect(payload['facilitatorHint']).toBe('payai');
  });
});
