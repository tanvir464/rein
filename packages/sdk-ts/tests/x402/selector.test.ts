import { describe, it, expect } from 'vitest';
import { selectAcceptable, type Requirement } from '../../src';

const DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const MAINNET_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function req(over: Partial<Requirement>): Requirement {
  return {
    facilitator: 'coinbase',
    scheme: 'exact',
    network: 'solana-devnet',
    asset: DEVNET_USDC,
    amount: 10_000n,
    recipient: 'A',
    raw: {},
    ...over,
  };
}

describe('selectAcceptable', () => {
  it('returns null for empty input', () => {
    expect(selectAcceptable([], { maxAmount: 100n })).toBeNull();
  });

  it('picks the cheapest of multiple acceptable', () => {
    const reqs = [
      req({ amount: 50_000n, recipient: 'A' }),
      req({ amount: 10_000n, recipient: 'B' }),
      req({ amount: 30_000n, recipient: 'C' }),
    ];
    const r = selectAcceptable(reqs, { maxAmount: 100_000n });
    expect(r?.amount).toBe(10_000n);
    expect(r?.recipient).toBe('B');
  });

  it('filters by maxAmount', () => {
    const reqs = [
      req({ amount: 100_000n }),
      req({ amount: 200_000n }),
    ];
    expect(selectAcceptable(reqs, { maxAmount: 50_000n })).toBeNull();
  });

  it('filters by allowlist', () => {
    const reqs = [
      req({ amount: 1_000n, recipient: 'A' }),
      req({ amount: 500n, recipient: 'B' }),
    ];
    const r = selectAcceptable(reqs, { maxAmount: 10_000n, allowlist: ['A'] });
    expect(r?.recipient).toBe('A');
  });

  it('filters by network (Solana only by default)', () => {
    const reqs = [
      req({ network: 'base-mainnet', asset: DEVNET_USDC }),
      req({ network: 'solana-mainnet', asset: MAINNET_USDC, amount: 5_000n }),
    ];
    const r = selectAcceptable(reqs, { maxAmount: 10_000n });
    expect(r?.network).toBe('solana-mainnet');
  });

  it('filters by asset (USDC only)', () => {
    const reqs = [
      req({ asset: 'OtherMint111111111111111111111111111111111' }),
      req({ asset: DEVNET_USDC, amount: 7_000n }),
    ];
    const r = selectAcceptable(reqs, { maxAmount: 10_000n });
    expect(r?.asset).toBe(DEVNET_USDC);
  });

  it('rejects expired requirements', () => {
    const past = new Date(Date.now() - 10_000);
    const reqs = [
      req({ amount: 1n, expiresAt: past }),
      req({ amount: 5_000n }),
    ];
    const r = selectAcceptable(reqs, { maxAmount: 10_000n });
    expect(r?.amount).toBe(5_000n);
  });
});
