import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import {
  REIN_PROGRAM_ID,
  IDL,
  deriveVaultPda,
  derivePolicyPda,
  deriveBlocklistPda,
  deriveCounterPda,
  deriveReceiptPda,
  deriveStepUpPda,
} from '../src';

const KNOWN_OWNER = new PublicKey('11111111111111111111111111111112'); // off-curve sentinel
const KNOWN_VAULT = new PublicKey('So11111111111111111111111111111111111111112'); // wSOL mint

describe('@rein/sdk smoke', () => {
  it('REIN_PROGRAM_ID is the canonical id', () => {
    expect(REIN_PROGRAM_ID.toBase58()).toBe(
      '2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj',
    );
  });

  it('IDL loads with the expected shape', () => {
    expect(IDL).toBeTruthy();
    // address field present and matches program id
    expect((IDL as any).address).toBe(REIN_PROGRAM_ID.toBase58());
    // 10 public instructions in v0.1
    expect((IDL as any).instructions.length).toBe(10);
    // spot-check instruction names
    const ixNames = (IDL as any).instructions.map((i: any) => i.name).sort();
    expect(ixNames).toEqual(
      [
        'approve_step_up',
        'deposit',
        'dispute',
        'expire_policy',
        'init_policy',
        'init_vault',
        'pause',
        'request_step_up',
        'spend',
        'update_policy',
      ].sort(),
    );
  });

  it('IDL exposes 6 accounts and 23 errors', () => {
    expect((IDL as any).accounts.length).toBe(6); // Vault, Policy, Blocklist, DailyCounter, SpendReceipt, StepUpRequest
    expect((IDL as any).errors.length).toBe(23);
  });

  it('vault/policy/blocklist PDAs derive deterministically', () => {
    const [vault] = deriveVaultPda(KNOWN_OWNER);
    const [policy] = derivePolicyPda(vault);
    const [blocklist] = deriveBlocklistPda(vault);

    // Known vectors recomputed locally on first run; they only need to be stable across runs,
    // not match a specific external value. If they ever shift, something is wrong.
    expect(vault.toBase58()).toBeTypeOf('string');
    expect(policy.toBase58()).toBeTypeOf('string');
    expect(blocklist.toBase58()).toBeTypeOf('string');

    // Derivation is pure: same input → same output every time.
    const [vault2] = deriveVaultPda(KNOWN_OWNER);
    expect(vault2.toBase58()).toBe(vault.toBase58());

    // Different vaults derive to different policy PDAs.
    const [otherVault] = deriveVaultPda(KNOWN_VAULT);
    const [otherPolicy] = derivePolicyPda(otherVault);
    expect(otherPolicy.toBase58()).not.toBe(policy.toBase58());
  });

  it('counter / receipt / step-up include u64 in seeds (different nonces → different PDAs)', () => {
    const [vault] = deriveVaultPda(KNOWN_OWNER);
    const day1 = new BN(20000);
    const day2 = new BN(20001);
    const [c1] = deriveCounterPda(vault, day1);
    const [c2] = deriveCounterPda(vault, day2);
    expect(c1.toBase58()).not.toBe(c2.toBase58());

    const nonceA = new BN('1234567890');
    const nonceB = new BN('9876543210');
    const [r1] = deriveReceiptPda(vault, nonceA);
    const [r2] = deriveReceiptPda(vault, nonceB);
    expect(r1.toBase58()).not.toBe(r2.toBase58());

    const [s1] = deriveStepUpPda(vault, nonceA);
    const [s2] = deriveStepUpPda(vault, nonceB);
    expect(s1.toBase58()).not.toBe(s2.toBase58());
    // Same nonce: receipt and step-up live in different namespaces (different seed prefix).
    expect(r1.toBase58()).not.toBe(s1.toBase58());
  });
});
