import type { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import type { Policy, Receipt } from '../types';

/** `bn.js` BN → native `bigint`. Safe for u64/i64. */
export function bnToBigint(n: BN): bigint {
  return BigInt(n.toString());
}

/** `bigint` → `bn.js` BN. Safe for u64/i64. */
export function bigintToBn(n: bigint): BN {
  return new BN(n.toString());
}

type RawPolicy = {
  version: number;
  dailyCap: BN;
  perTxCap: BN;
  allowlist: PublicKey[];
  allowlistLen: number;
  stepUpThreshold: BN;
  expiryTs: BN;
  paused: boolean;
};

type RawReceipt = {
  vault: PublicKey;
  amount: BN;
  recipient: PublicKey;
  ts: BN;
  policyVersion: number;
  nonce: BN;
  x402UrlHash: number[] | Uint8Array;
  disputed: boolean;
};

/** Convert an Anchor-fetched Policy account into the public `Policy` shape (bigints, base58 strings). */
export function decodePolicy(raw: RawPolicy): Policy {
  return {
    version: raw.version,
    dailyCap: bnToBigint(raw.dailyCap),
    perTxCap: bnToBigint(raw.perTxCap),
    allowlist: raw.allowlist
      .slice(0, raw.allowlistLen)
      .map((k) => k.toBase58()),
    stepUpThreshold: bnToBigint(raw.stepUpThreshold),
    expiryTs: raw.expiryTs.toNumber(),
    paused: raw.paused,
  };
}

/**
 * Convert an Anchor-fetched SpendReceipt into the public `Receipt`.
 *
 * `signature` is supplied separately because `SpendReceipt` doesn't store the
 * tx signature — the SDK looks it up via `getSignaturesForAddress(receiptPda)`
 * before calling this.
 */
export function decodeReceipt(args: {
  id: string;
  signature: string;
  raw: RawReceipt;
}): Receipt {
  const hashBytes = Array.from(args.raw.x402UrlHash);
  const isAllZero = hashBytes.length === 32 && hashBytes.every((b) => b === 0);
  return {
    id: args.id,
    signature: args.signature,
    vault: args.raw.vault.toBase58(),
    amount: bnToBigint(args.raw.amount),
    recipient: args.raw.recipient.toBase58(),
    ts: new Date(args.raw.ts.toNumber() * 1000),
    policyVersion: args.raw.policyVersion,
    nonce: bnToBigint(args.raw.nonce),
    x402UrlHash: isAllZero
      ? undefined
      : hashBytes.map((b) => b.toString(16).padStart(2, '0')).join(''),
    disputed: args.raw.disputed,
  };
}
