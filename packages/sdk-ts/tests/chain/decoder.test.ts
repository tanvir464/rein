import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { bnToBigint, bigintToBn, decodePolicy, decodeReceipt } from '../../src';

describe('bnToBigint / bigintToBn', () => {
  it('round-trips through bigint', () => {
    const a = new BN('18446744073709551615'); // u64::MAX
    expect(bnToBigint(a)).toBe(18446744073709551615n);
    expect(bigintToBn(18446744073709551615n).toString()).toBe(a.toString());
  });

  it('handles zero', () => {
    expect(bnToBigint(new BN(0))).toBe(0n);
    expect(bigintToBn(0n).toString()).toBe('0');
  });
});

describe('decodePolicy', () => {
  const k1 = Keypair.generate().publicKey;
  const k2 = Keypair.generate().publicKey;
  const k3 = Keypair.generate().publicKey;

  it('converts BN fields to bigint and slices allowlist by allowlistLen', () => {
    const p = decodePolicy({
      version: 7,
      dailyCap: new BN(5_000_000),
      perTxCap: new BN(500_000),
      allowlist: [k1, k2, k3, ...Array(13).fill(PublicKey.default)],
      allowlistLen: 2,
      stepUpThreshold: new BN(1_000_000),
      expiryTs: new BN(1_700_000_000),
      paused: false,
    });
    expect(p.version).toBe(7);
    expect(p.dailyCap).toBe(5_000_000n);
    expect(p.perTxCap).toBe(500_000n);
    expect(p.stepUpThreshold).toBe(1_000_000n);
    expect(p.expiryTs).toBe(1_700_000_000);
    expect(p.paused).toBe(false);
    expect(p.allowlist).toEqual([k1.toBase58(), k2.toBase58()]);
  });

  it('returns empty allowlist when len = 0', () => {
    const p = decodePolicy({
      version: 1,
      dailyCap: new BN(0),
      perTxCap: new BN(0),
      allowlist: [k1, k2, k3],
      allowlistLen: 0,
      stepUpThreshold: new BN(0),
      expiryTs: new BN(0),
      paused: true,
    });
    expect(p.allowlist).toEqual([]);
  });
});

describe('decodeReceipt', () => {
  const vault = Keypair.generate().publicKey;
  const recipient = Keypair.generate().publicKey;

  it('decodes a direct-transfer receipt (zero hash → undefined)', () => {
    const r = decodeReceipt({
      id: 'somePda',
      signature: 'someSig',
      raw: {
        vault,
        amount: new BN(123_456),
        recipient,
        ts: new BN(1_700_000_000),
        policyVersion: 3,
        nonce: new BN(42),
        x402UrlHash: new Array(32).fill(0),
        disputed: false,
      },
    });
    expect(r.id).toBe('somePda');
    expect(r.signature).toBe('someSig');
    expect(r.vault).toBe(vault.toBase58());
    expect(r.amount).toBe(123_456n);
    expect(r.recipient).toBe(recipient.toBase58());
    expect(r.ts).toBeInstanceOf(Date);
    expect(r.ts.getTime()).toBe(1_700_000_000 * 1000);
    expect(r.policyVersion).toBe(3);
    expect(r.nonce).toBe(42n);
    expect(r.x402UrlHash).toBeUndefined();
    expect(r.disputed).toBe(false);
  });

  it('decodes an x402 receipt (non-zero hash → hex string)', () => {
    const hashBytes = new Array(32).fill(0xaa);
    hashBytes[0] = 0x01;
    const r = decodeReceipt({
      id: 'pda',
      signature: 'sig',
      raw: {
        vault,
        amount: new BN(1),
        recipient,
        ts: new BN(0),
        policyVersion: 1,
        nonce: new BN(1),
        x402UrlHash: hashBytes,
        disputed: false,
      },
    });
    expect(r.x402UrlHash).toBe(
      '01' + 'aa'.repeat(31),
    );
  });

  it('marks disputed correctly', () => {
    const r = decodeReceipt({
      id: 'p',
      signature: 's',
      raw: {
        vault,
        amount: new BN(1),
        recipient,
        ts: new BN(0),
        policyVersion: 1,
        nonce: new BN(1),
        x402UrlHash: new Array(32).fill(0),
        disputed: true,
      },
    });
    expect(r.disputed).toBe(true);
  });
});
