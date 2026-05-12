import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { simulate, type SimulatorState, type SimulatorRequest } from '../../src';

const RECIPIENT = Keypair.generate().publicKey;
const OTHER_RECIPIENT = Keypair.generate().publicKey;
const VAULT = Keypair.generate().publicKey;

const NOW_DAY = new BN(20212);

const baseState = (overrides: Partial<SimulatorState> = {}): SimulatorState => ({
  policy: {
    paused: false,
    expiryTs: new BN(0),
    perTxCap: new BN(500_000),     // $0.50
    dailyCap: new BN(5_000_000),   // $5
    stepUpThreshold: new BN(1_000_000), // $1
    allowlistLen: 0,
    allowlist: [],
    version: 1,
    ...overrides.policy,
  },
  blocklist: { len: 0, entries: [], ...overrides.blocklist },
  dailyCounter: { spent: new BN(0), ...overrides.dailyCounter },
  stepUpRequest: overrides.stepUpRequest ?? null,
  onChainDay: overrides.onChainDay ?? NOW_DAY,
});

const baseRequest = (overrides: Partial<SimulatorRequest> = {}): SimulatorRequest => ({
  amount: new BN(300_000), // $0.30
  recipient: RECIPIENT,
  nonce: new BN(1),
  day: NOW_DAY,
  ...overrides,
});

describe('simulate — happy paths', () => {
  it('within all caps + empty allowlist → ok', () => {
    const r = simulate(baseState(), baseRequest());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.willCost.toString()).toBe('300000');
      expect(r.dailySpentAfter.toString()).toBe('300000');
    }
  });

  it('exact per_tx_cap (boundary) → ok', () => {
    const r = simulate(baseState(), baseRequest({ amount: new BN(500_000) }));
    expect(r.ok).toBe(true);
  });

  it('exact daily_cap (boundary, considering counter) → ok', () => {
    // counter has $4.50 spent; per_tx is $0.50; new spend $0.50 reaches the $5 cap exactly
    const r = simulate(
      baseState({ dailyCounter: { spent: new BN(4_500_000) } }),
      baseRequest({ amount: new BN(500_000) }),
    );
    expect(r.ok).toBe(true);
  });

  it('allowlisted recipient → ok', () => {
    const r = simulate(
      baseState({ policy: { ...baseState().policy, allowlistLen: 1, allowlist: [RECIPIENT] } }),
      baseRequest(),
    );
    expect(r.ok).toBe(true);
  });

  it('approved + matching step-up bypasses threshold → ok', () => {
    // amount above threshold but within per_tx_cap; matching approved request attached
    const amount = new BN(400_000); // > step_up_threshold (which we bump down for this test)
    const policy = { ...baseState().policy, stepUpThreshold: new BN(100_000) };
    const r = simulate(
      baseState({
        policy,
        stepUpRequest: {
          vault: VAULT,
          amount,
          recipient: RECIPIENT,
          nonce: new BN(1),
          // expiresAt far in the future (in seconds)
          expiresAt: NOW_DAY.muln(86_400).addn(86_400),
          approved: true,
        },
      }),
      baseRequest({ amount }),
    );
    expect(r.ok).toBe(true);
  });
});

describe('simulate — negative paths (reasons in F3 check order)', () => {
  it('day mismatch → ErrCounterDayMismatch', () => {
    const r = simulate(baseState(), baseRequest({ day: new BN(99999) }));
    expect(r).toMatchObject({ ok: false, reason: 'ErrCounterDayMismatch' });
  });

  it('paused → ErrPaused', () => {
    const r = simulate(baseState({ policy: { ...baseState().policy, paused: true } }), baseRequest());
    expect(r).toMatchObject({ ok: false, reason: 'ErrPaused' });
  });

  it('expired (expiry_ts in past relative to onChainDay) → ErrExpired', () => {
    const past = NOW_DAY.muln(86_400).subn(60);
    const r = simulate(
      baseState({ policy: { ...baseState().policy, expiryTs: past } }),
      baseRequest(),
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrExpired' });
  });

  it('amount = 0 → ErrAmountZero', () => {
    const r = simulate(baseState(), baseRequest({ amount: new BN(0) }));
    expect(r).toMatchObject({ ok: false, reason: 'ErrAmountZero' });
  });

  it('amount > per_tx_cap → ErrPerTxCap', () => {
    const r = simulate(baseState(), baseRequest({ amount: new BN(600_000) }));
    expect(r).toMatchObject({ ok: false, reason: 'ErrPerTxCap' });
  });

  it('non-allowlisted recipient → ErrRecipientNotAllowed', () => {
    const r = simulate(
      baseState({
        policy: { ...baseState().policy, allowlistLen: 1, allowlist: [OTHER_RECIPIENT] },
      }),
      baseRequest(),
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrRecipientNotAllowed' });
  });

  it('blocked recipient (in both allow + block) → ErrRecipientBlocked', () => {
    const r = simulate(
      baseState({
        policy: { ...baseState().policy, allowlistLen: 1, allowlist: [RECIPIENT] },
        blocklist: { len: 1, entries: [RECIPIENT] },
      }),
      baseRequest(),
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrRecipientBlocked' });
  });

  it('over step_up_threshold without request → ErrStepUpRequired + suggestedStepUp', () => {
    const policy = { ...baseState().policy, stepUpThreshold: new BN(100_000) };
    const r = simulate(baseState({ policy }), baseRequest({ amount: new BN(200_000) }));
    expect(r).toMatchObject({ ok: false, reason: 'ErrStepUpRequired' });
    if (!r.ok && r.reason === 'ErrStepUpRequired') {
      expect(r.suggestedStepUp?.amount.toString()).toBe('200000');
      expect(r.suggestedStepUp?.threshold.toString()).toBe('100000');
    }
  });

  it('step-up request exists but unapproved → ErrStepUpRequired (no suggestion)', () => {
    const policy = { ...baseState().policy, stepUpThreshold: new BN(100_000) };
    const r = simulate(
      baseState({
        policy,
        stepUpRequest: {
          vault: VAULT,
          amount: new BN(200_000),
          recipient: RECIPIENT,
          nonce: new BN(1),
          expiresAt: NOW_DAY.muln(86_400).addn(86_400),
          approved: false,
        },
      }),
      baseRequest({ amount: new BN(200_000) }),
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrStepUpRequired' });
    if (!r.ok && r.reason === 'ErrStepUpRequired') {
      // Tightly: when a request exists, no suggestion is included.
      expect(r.suggestedStepUp).toBeUndefined();
    }
  });

  it('step-up amount mismatch → ErrStepUpMismatch', () => {
    const policy = { ...baseState().policy, stepUpThreshold: new BN(100_000) };
    const r = simulate(
      baseState({
        policy,
        stepUpRequest: {
          vault: VAULT,
          amount: new BN(150_000), // request has 150k
          recipient: RECIPIENT,
          nonce: new BN(1),
          expiresAt: NOW_DAY.muln(86_400).addn(86_400),
          approved: true,
        },
      }),
      baseRequest({ amount: new BN(200_000) }), // spending 200k
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrStepUpMismatch' });
  });

  it('step-up expired → ErrStepUpExpired', () => {
    const policy = { ...baseState().policy, stepUpThreshold: new BN(100_000) };
    const r = simulate(
      baseState({
        policy,
        stepUpRequest: {
          vault: VAULT,
          amount: new BN(200_000),
          recipient: RECIPIENT,
          nonce: new BN(1),
          expiresAt: NOW_DAY.muln(86_400).subn(60), // expired 60s before "now"
          approved: true,
        },
      }),
      baseRequest({ amount: new BN(200_000) }),
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrStepUpExpired' });
  });

  it('counter + amount > daily_cap → ErrDailyCap', () => {
    const r = simulate(
      baseState({ dailyCounter: { spent: new BN(4_800_000) } }), // already $4.80 spent
      baseRequest({ amount: new BN(500_000) }), // would push to $5.30 vs $5 cap
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrDailyCap' });
  });
});

describe('simulate — check order (multi-failure cases)', () => {
  it('paused beats expired beats per-tx', () => {
    // All three should trip; the simulator must report the first one (paused).
    const past = NOW_DAY.muln(86_400).subn(60);
    const r = simulate(
      baseState({
        policy: { ...baseState().policy, paused: true, expiryTs: past },
      }),
      baseRequest({ amount: new BN(999_999_999) }),
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrPaused' });
  });

  it('day mismatch beats everything', () => {
    const r = simulate(
      baseState({ policy: { ...baseState().policy, paused: true } }),
      baseRequest({ day: new BN(0), amount: new BN(0) }),
    );
    expect(r).toMatchObject({ ok: false, reason: 'ErrCounterDayMismatch' });
  });
});
