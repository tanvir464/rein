import { describe, it, expect } from 'vitest';
import { parsePaymentRequirements } from '../../src';

const COINBASE_ENVELOPE = {
  x402Version: '0.3',
  accepts: [
    {
      scheme: 'exact',
      network: 'solana-devnet',
      asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      maxAmountRequired: '50000',
      payTo: 'DAuREczTpcXgnRBdaSp5xDvajT2dVhqzrHpRq3RU2NAt',
      description: 'API call',
    },
  ],
};

const PAYAI_ENVELOPE = {
  x402Version: '0.3',
  accepts: [
    {
      scheme: 'exact',
      network: 'solana-mainnet',
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: 100_000,
      payee: 'PayaiVault1111111111111111111111111111111111',
      extra: { facilitator: 'payai' },
    },
  ],
};

const CORBITS_ENVELOPE = {
  paymentRequirements: [
    {
      scheme: 'exact',
      network: 'solana-mainnet',
      asset: 'corbits:USDC',
      amountMicro: '25000',
      recipient: 'CorbitsRecipient1111111111111111111111111111',
    },
  ],
};

describe('parsePaymentRequirements — facilitators', () => {
  it('parses a Coinbase envelope', () => {
    const reqs = parsePaymentRequirements(COINBASE_ENVELOPE);
    expect(reqs).toHaveLength(1);
    expect(reqs[0]).toMatchObject({
      facilitator: 'coinbase',
      scheme: 'exact',
      network: 'solana-devnet',
      asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      amount: 50_000n,
      recipient: 'DAuREczTpcXgnRBdaSp5xDvajT2dVhqzrHpRq3RU2NAt',
      description: 'API call',
    });
  });

  it('parses PayAI shape with explicit facilitator extra', () => {
    const reqs = parsePaymentRequirements(PAYAI_ENVELOPE);
    expect(reqs[0]?.facilitator).toBe('payai');
    expect(reqs[0]?.amount).toBe(100_000n);
    expect(reqs[0]?.recipient).toBe('PayaiVault1111111111111111111111111111111111');
  });

  it('parses Corbits via asset prefix and `paymentRequirements` envelope', () => {
    const reqs = parsePaymentRequirements(CORBITS_ENVELOPE);
    expect(reqs[0]?.facilitator).toBe('corbits');
    expect(reqs[0]?.amount).toBe(25_000n);
  });
});

describe('parsePaymentRequirements — edge cases', () => {
  it('returns [] for non-object input', () => {
    expect(parsePaymentRequirements(null)).toEqual([]);
    expect(parsePaymentRequirements(undefined)).toEqual([]);
    expect(parsePaymentRequirements('string')).toEqual([]);
    expect(parsePaymentRequirements(42)).toEqual([]);
  });

  it('returns [] when no recognizable accepts list', () => {
    expect(parsePaymentRequirements({ foo: 'bar' })).toEqual([]);
  });

  it('skips entries with missing required fields', () => {
    const reqs = parsePaymentRequirements({
      accepts: [
        { scheme: 'exact' }, // missing everything else
        {
          scheme: 'exact',
          network: 'solana-devnet',
          asset: 'A',
          maxAmountRequired: '1',
          payTo: 'X',
        },
      ],
    });
    expect(reqs).toHaveLength(1);
  });

  it('handles multiple entries', () => {
    const reqs = parsePaymentRequirements({
      x402Version: '0.3',
      accepts: [
        {
          scheme: 'exact',
          network: 'solana-devnet',
          asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          maxAmountRequired: '50000',
          payTo: 'A',
        },
        {
          scheme: 'exact',
          network: 'solana-devnet',
          asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          maxAmountRequired: '40000',
          payTo: 'B',
        },
      ],
    });
    expect(reqs).toHaveLength(2);
    expect(reqs[1]?.amount).toBe(40_000n);
  });

  it('parses expiresAt when present', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const reqs = parsePaymentRequirements({
      x402Version: '0.3',
      accepts: [
        {
          scheme: 'exact',
          network: 'solana-devnet',
          asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          maxAmountRequired: '1',
          payTo: 'X',
          expiresAt: future,
        },
      ],
    });
    expect(reqs[0]?.expiresAt).toBeInstanceOf(Date);
  });
});
