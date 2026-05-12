import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export type PolicyArgsLike = {
  dailyCap: BN;
  perTxCap: BN;
  stepUpThreshold: BN;
  expiryTs: BN;
  paused: boolean;
  allowlist: PublicKey[];
};

// Express USDC amounts as fractional dollars at the test boundary; convert once to micro-USDC.
export function dollars(n: number): BN {
  return new BN(Math.round(n * 1_000_000));
}

export function defaultPolicyArgs(overrides: Partial<PolicyArgsLike> = {}): PolicyArgsLike {
  return {
    dailyCap: dollars(5), // $5/day
    perTxCap: dollars(0.5), // $0.50/tx
    stepUpThreshold: dollars(1), // step-up over $1
    expiryTs: new BN(0), // never expires
    paused: false,
    allowlist: [],
    ...overrides,
  };
}
