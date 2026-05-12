/**
 * Deterministic generator for `policy-cases.json` — the shared fixture set
 * that every simulator (TS, Python, Anchor) MUST agree on.
 *
 * Run: `corepack pnpm -F @rein/sdk exec tsx scripts/gen-policy-cases.ts`
 * Output: `specs/features/F16-fixtures/policy-cases.json`
 *
 * The generator is deterministic — same code produces same JSON byte-for-byte.
 * Cases are written by category so a reader can add or remove a class of
 * inputs in one place without renumbering the whole file.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import {
  simulate,
  type SimulatorRequest,
  type SimulatorState,
  type SimReason,
} from '../src/index';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURE_PATH = `${ROOT}../../specs/features/F16-fixtures/policy-cases.json`;

// ─── Deterministic keys ─────────────────────────────────────────────
// Derived from fixed 32-byte seeds so the JSON is byte-stable.
function keyFromSeed(seedHex: string): PublicKey {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(seedHex.slice((i * 2) % seedHex.length, ((i * 2) % seedHex.length) + 2), 16);
  }
  return Keypair.fromSeed(bytes).publicKey;
}

const VAULT = keyFromSeed('a1b2c3d4');
const ALICE = keyFromSeed('a55e7e01');
const BOB = keyFromSeed('b08e7e02');
const CARLA = keyFromSeed('ca81a703');
const DAVE = keyFromSeed('da7e7e04');

// ─── Wire-shape (matches what TS / Python / Rust deserialize) ──────
type WireState = {
  policy: {
    paused: boolean;
    expiryTs: string;
    perTxCap: string;
    dailyCap: string;
    stepUpThreshold: string;
    allowlistLen: number;
    allowlist: string[];
    version: number;
  };
  blocklist: { len: number; entries: string[] };
  dailyCounter: { spent: string };
  stepUpRequest: null | {
    vault: string;
    amount: string;
    recipient: string;
    nonce: string;
    expiresAt: string;
    approved: boolean;
  };
  onChainDay: string;
};
type WireRequest = {
  amount: string;
  recipient: string;
  nonce: string;
  day: string;
};
type WireExpected =
  | { ok: true; willCost: string; dailySpentAfter: string }
  | { ok: false; reason: SimReason; suggestedStepUp?: { amount: string; threshold: string } };

type Case = {
  name: string;
  category:
    | 'happy'
    | 'paused'
    | 'expired'
    | 'amount-zero'
    | 'per-tx-cap'
    | 'daily-cap'
    | 'allowlist'
    | 'blocklist'
    | 'step-up'
    | 'day-mismatch'
    | 'priority';
  state: WireState;
  request: WireRequest;
  expected: WireExpected;
};

// ─── Defaults (mirror the test's `baseState` so we generate sane shapes) ─
const NOW_DAY = new BN(20212);
const SECONDS_PER_DAY = 86_400;

function defaultState(over: Partial<SimulatorState> = {}): SimulatorState {
  return {
    policy: {
      paused: false,
      expiryTs: new BN(0),
      perTxCap: new BN(500_000),
      dailyCap: new BN(5_000_000),
      stepUpThreshold: new BN(1_000_000),
      allowlistLen: 0,
      allowlist: [],
      version: 1,
      ...over.policy,
    },
    blocklist: { len: 0, entries: [], ...over.blocklist },
    dailyCounter: { spent: new BN(0), ...over.dailyCounter },
    stepUpRequest: over.stepUpRequest ?? null,
    onChainDay: over.onChainDay ?? NOW_DAY,
  };
}

function defaultRequest(over: Partial<SimulatorRequest> = {}): SimulatorRequest {
  return {
    amount: new BN(300_000),
    recipient: ALICE,
    nonce: new BN(1),
    day: NOW_DAY,
    ...over,
  };
}

function toWire(state: SimulatorState, request: SimulatorRequest): {
  state: WireState;
  request: WireRequest;
} {
  return {
    state: {
      policy: {
        paused: state.policy.paused,
        expiryTs: state.policy.expiryTs.toString(),
        perTxCap: state.policy.perTxCap.toString(),
        dailyCap: state.policy.dailyCap.toString(),
        stepUpThreshold: state.policy.stepUpThreshold.toString(),
        allowlistLen: state.policy.allowlistLen,
        allowlist: state.policy.allowlist.map((k) => k.toBase58()),
        version: state.policy.version,
      },
      blocklist: {
        len: state.blocklist.len,
        entries: state.blocklist.entries.map((k) => k.toBase58()),
      },
      dailyCounter: { spent: state.dailyCounter.spent.toString() },
      stepUpRequest: state.stepUpRequest
        ? {
            vault: state.stepUpRequest.vault.toBase58(),
            amount: state.stepUpRequest.amount.toString(),
            recipient: state.stepUpRequest.recipient.toBase58(),
            nonce: state.stepUpRequest.nonce.toString(),
            expiresAt: state.stepUpRequest.expiresAt.toString(),
            approved: state.stepUpRequest.approved,
          }
        : null,
      onChainDay: state.onChainDay.toString(),
    },
    request: {
      amount: request.amount.toString(),
      recipient: request.recipient.toBase58(),
      nonce: request.nonce.toString(),
      day: request.day.toString(),
    },
  };
}

function expectedFromSim(state: SimulatorState, request: SimulatorRequest): WireExpected {
  const r = simulate(state, request);
  if (r.ok) {
    return {
      ok: true,
      willCost: r.willCost.toString(),
      dailySpentAfter: r.dailySpentAfter.toString(),
    };
  }
  return {
    ok: false,
    reason: r.reason,
    ...(r.suggestedStepUp
      ? {
          suggestedStepUp: {
            amount: r.suggestedStepUp.amount.toString(),
            threshold: r.suggestedStepUp.threshold.toString(),
          },
        }
      : {}),
  };
}

function mkCase(
  name: string,
  category: Case['category'],
  state: SimulatorState,
  request: SimulatorRequest,
): Case {
  const wire = toWire(state, request);
  return {
    name,
    category,
    state: wire.state,
    request: wire.request,
    expected: expectedFromSim(state, request),
  };
}

// ─── Case builders ───────────────────────────────────────────────────
const cases: Case[] = [];

// HAPPY (8)
cases.push(
  mkCase('happy: well within all caps', 'happy', defaultState(), defaultRequest()),
  mkCase('happy: exact per_tx_cap', 'happy', defaultState(), defaultRequest({ amount: new BN(500_000) })),
  mkCase(
    'happy: counter at 0, spend $0.30',
    'happy',
    defaultState({ dailyCounter: { spent: new BN(0) } }),
    defaultRequest({ amount: new BN(300_000) }),
  ),
  mkCase(
    'happy: counter at $4.50, spend exactly to cap ($0.50)',
    'happy',
    defaultState({ dailyCounter: { spent: new BN(4_500_000) } }),
    defaultRequest({ amount: new BN(500_000) }),
  ),
  mkCase(
    'happy: allowlist with single match',
    'happy',
    defaultState({
      policy: { ...defaultState().policy, allowlistLen: 1, allowlist: [ALICE] },
    }),
    defaultRequest(),
  ),
  mkCase(
    'happy: allowlist with multiple, recipient is the third',
    'happy',
    defaultState({
      policy: {
        ...defaultState().policy,
        allowlistLen: 3,
        allowlist: [BOB, CARLA, ALICE],
      },
    }),
    defaultRequest({ recipient: ALICE }),
  ),
  mkCase(
    'happy: amount = 1 micro-USDC (lower edge)',
    'happy',
    defaultState(),
    defaultRequest({ amount: new BN(1) }),
  ),
  mkCase(
    'happy: step_up_threshold = 0 means never required',
    'happy',
    defaultState({ policy: { ...defaultState().policy, stepUpThreshold: new BN(0) } }),
    defaultRequest({ amount: new BN(500_000) }),
  ),
);

// PAUSED (4)
cases.push(
  mkCase(
    'paused: simple',
    'paused',
    defaultState({ policy: { ...defaultState().policy, paused: true } }),
    defaultRequest(),
  ),
  mkCase(
    'paused: even with valid step-up',
    'paused',
    defaultState({
      policy: { ...defaultState().policy, paused: true, stepUpThreshold: new BN(100_000) },
      stepUpRequest: {
        vault: VAULT,
        amount: new BN(200_000),
        recipient: ALICE,
        nonce: new BN(1),
        expiresAt: NOW_DAY.muln(SECONDS_PER_DAY).addn(86_400),
        approved: true,
      },
    }),
    defaultRequest({ amount: new BN(200_000) }),
  ),
  mkCase(
    'paused: even when within all caps',
    'paused',
    defaultState({ policy: { ...defaultState().policy, paused: true } }),
    defaultRequest({ amount: new BN(1) }),
  ),
  mkCase(
    'paused: even with empty allowlist',
    'paused',
    defaultState({ policy: { ...defaultState().policy, paused: true } }),
    defaultRequest(),
  ),
);

// EXPIRED (4)
cases.push(
  mkCase(
    'expired: expiry_ts in past (1 minute ago)',
    'expired',
    defaultState({
      policy: {
        ...defaultState().policy,
        expiryTs: NOW_DAY.muln(SECONDS_PER_DAY).subn(60),
      },
    }),
    defaultRequest(),
  ),
  mkCase(
    'expired: expiry_ts == nowSec (boundary fail-closed)',
    'expired',
    defaultState({
      policy: { ...defaultState().policy, expiryTs: NOW_DAY.muln(SECONDS_PER_DAY) },
    }),
    defaultRequest(),
  ),
  mkCase(
    'expired: even within caps',
    'expired',
    defaultState({
      policy: {
        ...defaultState().policy,
        expiryTs: NOW_DAY.muln(SECONDS_PER_DAY).subn(1),
      },
    }),
    defaultRequest({ amount: new BN(1) }),
  ),
  mkCase(
    'happy: expiry_ts = 0 means never expires',
    'happy',
    defaultState({ policy: { ...defaultState().policy, expiryTs: new BN(0) } }),
    defaultRequest(),
  ),
);

// AMOUNT-ZERO (3)
cases.push(
  mkCase('amount-zero: exact zero', 'amount-zero', defaultState(), defaultRequest({ amount: new BN(0) })),
  mkCase(
    'amount-zero: zero with full state',
    'amount-zero',
    defaultState({
      dailyCounter: { spent: new BN(1_000_000) },
      policy: { ...defaultState().policy, allowlistLen: 1, allowlist: [ALICE] },
    }),
    defaultRequest({ amount: new BN(0) }),
  ),
  mkCase(
    'amount-zero: zero on a paused policy still ErrPaused (paused beats zero)',
    'paused',
    defaultState({ policy: { ...defaultState().policy, paused: true } }),
    defaultRequest({ amount: new BN(0) }),
  ),
);

// PER-TX-CAP (5)
cases.push(
  mkCase(
    'per-tx-cap: $0.50 cap, request $0.51',
    'per-tx-cap',
    defaultState({ policy: { ...defaultState().policy, perTxCap: new BN(500_000) } }),
    defaultRequest({ amount: new BN(510_000) }),
  ),
  mkCase(
    'per-tx-cap: $1 cap, request $1.01',
    'per-tx-cap',
    defaultState({ policy: { ...defaultState().policy, perTxCap: new BN(1_000_000), dailyCap: new BN(10_000_000) } }),
    defaultRequest({ amount: new BN(1_010_000) }),
  ),
  mkCase(
    'per-tx-cap: huge over',
    'per-tx-cap',
    defaultState(),
    defaultRequest({ amount: new BN(999_999_999) }),
  ),
  mkCase(
    'per-tx-cap: exact +1',
    'per-tx-cap',
    defaultState(),
    defaultRequest({ amount: new BN(500_001) }),
  ),
  mkCase(
    'per-tx-cap: cap of 1, request 2',
    'per-tx-cap',
    defaultState({
      policy: { ...defaultState().policy, perTxCap: new BN(1), dailyCap: new BN(10) },
    }),
    defaultRequest({ amount: new BN(2) }),
  ),
);

// DAILY-CAP (8)
cases.push(
  mkCase(
    'daily-cap: counter at 4.8M, spend 0.5M (overflow)',
    'daily-cap',
    defaultState({ dailyCounter: { spent: new BN(4_800_000) } }),
    defaultRequest({ amount: new BN(500_000) }),
  ),
  mkCase(
    'daily-cap: counter at 5M-1, spend 2 (overflow)',
    'daily-cap',
    defaultState({ dailyCounter: { spent: new BN(4_999_999) } }),
    defaultRequest({ amount: new BN(2) }),
  ),
  mkCase(
    'happy: counter at 5M-2, spend 2 (boundary)',
    'happy',
    defaultState({ dailyCounter: { spent: new BN(4_999_998) } }),
    defaultRequest({ amount: new BN(2) }),
  ),
  mkCase(
    'daily-cap: small cap of 100, counter 0, spend 101',
    'per-tx-cap',
    defaultState({
      policy: { ...defaultState().policy, dailyCap: new BN(100), perTxCap: new BN(150) },
    }),
    defaultRequest({ amount: new BN(101) }),
  ),
  mkCase(
    'daily-cap: small cap 100, counter 50, spend 60 (overflow)',
    'daily-cap',
    defaultState({
      policy: { ...defaultState().policy, dailyCap: new BN(100), perTxCap: new BN(70) },
      dailyCounter: { spent: new BN(50) },
    }),
    defaultRequest({ amount: new BN(60) }),
  ),
  mkCase(
    'daily-cap: counter == cap, any spend overflows',
    'daily-cap',
    defaultState({ dailyCounter: { spent: new BN(5_000_000) } }),
    defaultRequest({ amount: new BN(1) }),
  ),
  mkCase(
    'happy: counter at cap-1, spend 1 (exact boundary)',
    'happy',
    defaultState({ dailyCounter: { spent: new BN(4_999_999) } }),
    defaultRequest({ amount: new BN(1) }),
  ),
  mkCase(
    'happy: counter at 0, spend full cap',
    'happy',
    defaultState({
      policy: { ...defaultState().policy, perTxCap: new BN(5_000_000) },
      dailyCounter: { spent: new BN(0) },
    }),
    defaultRequest({ amount: new BN(5_000_000) }),
  ),
);

// ALLOWLIST (8)
cases.push(
  mkCase(
    'allowlist: empty list = wildcard, any recipient OK',
    'happy',
    defaultState(),
    defaultRequest({ recipient: DAVE }),
  ),
  mkCase(
    'allowlist: single ALICE, request to BOB → reject',
    'allowlist',
    defaultState({ policy: { ...defaultState().policy, allowlistLen: 1, allowlist: [ALICE] } }),
    defaultRequest({ recipient: BOB }),
  ),
  mkCase(
    'allowlist: 2-entry list, recipient is first',
    'happy',
    defaultState({
      policy: { ...defaultState().policy, allowlistLen: 2, allowlist: [ALICE, BOB] },
    }),
    defaultRequest({ recipient: ALICE }),
  ),
  mkCase(
    'allowlist: 2-entry list, recipient is second',
    'happy',
    defaultState({
      policy: { ...defaultState().policy, allowlistLen: 2, allowlist: [ALICE, BOB] },
    }),
    defaultRequest({ recipient: BOB }),
  ),
  mkCase(
    'allowlist: ignores entries past allowlistLen',
    'allowlist',
    defaultState({
      policy: {
        ...defaultState().policy,
        allowlistLen: 1,
        allowlist: [ALICE, BOB, CARLA], // BOB and CARLA "in array" but len caps at 1
      },
    }),
    defaultRequest({ recipient: BOB }),
  ),
  mkCase(
    'allowlist: full 16 entries, recipient at last position',
    'happy',
    defaultState({
      policy: {
        ...defaultState().policy,
        allowlistLen: 16,
        allowlist: [
          ALICE, BOB, CARLA, DAVE, ALICE, BOB, CARLA, DAVE,
          ALICE, BOB, CARLA, DAVE, ALICE, BOB, CARLA, DAVE,
        ],
      },
    }),
    defaultRequest({ recipient: DAVE }),
  ),
  mkCase(
    'allowlist: recipient is wallet pubkey not present',
    'allowlist',
    defaultState({
      policy: { ...defaultState().policy, allowlistLen: 2, allowlist: [ALICE, BOB] },
    }),
    defaultRequest({ recipient: CARLA }),
  ),
  mkCase(
    'allowlist: same key listed twice still allowed',
    'happy',
    defaultState({
      policy: { ...defaultState().policy, allowlistLen: 2, allowlist: [ALICE, ALICE] },
    }),
    defaultRequest({ recipient: ALICE }),
  ),
);

// BLOCKLIST (5)
cases.push(
  mkCase(
    'blocklist: empty, no effect',
    'happy',
    defaultState({ blocklist: { len: 0, entries: [] } }),
    defaultRequest({ recipient: ALICE }),
  ),
  mkCase(
    'blocklist: recipient is blocked',
    'blocklist',
    defaultState({ blocklist: { len: 1, entries: [ALICE] } }),
    defaultRequest({ recipient: ALICE }),
  ),
  mkCase(
    'blocklist: recipient is in allowlist + blocklist → blocked',
    'blocklist',
    defaultState({
      policy: { ...defaultState().policy, allowlistLen: 1, allowlist: [ALICE] },
      blocklist: { len: 1, entries: [ALICE] },
    }),
    defaultRequest({ recipient: ALICE }),
  ),
  mkCase(
    'blocklist: 8 entries (max), recipient is last',
    'blocklist',
    defaultState({
      blocklist: {
        len: 8,
        entries: [BOB, CARLA, DAVE, BOB, CARLA, DAVE, BOB, ALICE],
      },
    }),
    defaultRequest({ recipient: ALICE }),
  ),
  mkCase(
    'blocklist: ignores entries past len',
    'happy',
    defaultState({
      blocklist: { len: 0, entries: [ALICE] },
    }),
    defaultRequest({ recipient: ALICE }),
  ),
);

// STEP-UP (12)
const validStepUp = (overrides: { amount: BN; recipient?: PublicKey; nonce?: BN; expiresAtOffset?: number; approved?: boolean }) => ({
  vault: VAULT,
  amount: overrides.amount,
  recipient: overrides.recipient ?? ALICE,
  nonce: overrides.nonce ?? new BN(1),
  expiresAt: NOW_DAY.muln(SECONDS_PER_DAY).addn(overrides.expiresAtOffset ?? 86_400),
  approved: overrides.approved ?? true,
});

cases.push(
  mkCase(
    'step-up: amount under threshold, no request needed',
    'happy',
    defaultState({ policy: { ...defaultState().policy, stepUpThreshold: new BN(1_000_000) } }),
    defaultRequest({ amount: new BN(500_000) }),
  ),
  mkCase(
    'step-up: amount over threshold, no request → ErrStepUpRequired with suggestion',
    'step-up',
    defaultState({ policy: { ...defaultState().policy, stepUpThreshold: new BN(100_000) } }),
    defaultRequest({ amount: new BN(200_000) }),
  ),
  mkCase(
    'step-up: matching approved request → ok',
    'happy',
    defaultState({
      policy: { ...defaultState().policy, stepUpThreshold: new BN(100_000) },
      stepUpRequest: validStepUp({ amount: new BN(200_000) }),
    }),
    defaultRequest({ amount: new BN(200_000) }),
  ),
  mkCase(
    'step-up: matching but unapproved → ErrStepUpRequired (no suggestion)',
    'step-up',
    defaultState({
      policy: { ...defaultState().policy, stepUpThreshold: new BN(100_000) },
      stepUpRequest: validStepUp({ amount: new BN(200_000), approved: false }),
    }),
    defaultRequest({ amount: new BN(200_000) }),
  ),
  mkCase(
    'step-up: amount mismatch → ErrStepUpMismatch',
    'step-up',
    defaultState({
      policy: { ...defaultState().policy, stepUpThreshold: new BN(100_000) },
      stepUpRequest: validStepUp({ amount: new BN(150_000) }),
    }),
    defaultRequest({ amount: new BN(200_000) }),
  ),
  mkCase(
    'step-up: nonce mismatch → ErrStepUpMismatch',
    'step-up',
    defaultState({
      policy: { ...defaultState().policy, stepUpThreshold: new BN(100_000) },
      stepUpRequest: validStepUp({ amount: new BN(200_000), nonce: new BN(99) }),
    }),
    defaultRequest({ amount: new BN(200_000), nonce: new BN(1) }),
  ),
  mkCase(
    'step-up: recipient mismatch → ErrStepUpMismatch',
    'step-up',
    defaultState({
      policy: { ...defaultState().policy, stepUpThreshold: new BN(100_000) },
      stepUpRequest: validStepUp({ amount: new BN(200_000), recipient: BOB }),
    }),
    defaultRequest({ amount: new BN(200_000), recipient: ALICE }),
  ),
  mkCase(
    'step-up: expired (expiresAt < now) → ErrStepUpExpired',
    'step-up',
    defaultState({
      policy: { ...defaultState().policy, stepUpThreshold: new BN(100_000) },
      stepUpRequest: validStepUp({ amount: new BN(200_000), expiresAtOffset: -60 }),
    }),
    defaultRequest({ amount: new BN(200_000) }),
  ),
  mkCase(
    'step-up: at exact threshold, no step-up needed',
    'happy',
    defaultState({ policy: { ...defaultState().policy, stepUpThreshold: new BN(200_000) } }),
    defaultRequest({ amount: new BN(200_000) }),
  ),
  mkCase(
    'step-up: 1 over threshold needs step-up',
    'step-up',
    defaultState({ policy: { ...defaultState().policy, stepUpThreshold: new BN(200_000) } }),
    defaultRequest({ amount: new BN(200_001) }),
  ),
  mkCase(
    'step-up: threshold = 0 disables (any amount needs no step-up)',
    'happy',
    defaultState({ policy: { ...defaultState().policy, stepUpThreshold: new BN(0) } }),
    defaultRequest({ amount: new BN(500_000) }),
  ),
  mkCase(
    'step-up: approved + matching but cap fails first → ErrPerTxCap (priority)',
    'priority',
    defaultState({
      policy: { ...defaultState().policy, perTxCap: new BN(100), stepUpThreshold: new BN(50) },
      stepUpRequest: validStepUp({ amount: new BN(200), nonce: new BN(1) }),
    }),
    defaultRequest({ amount: new BN(200), nonce: new BN(1) }),
  ),
);

// DAY-MISMATCH (3)
cases.push(
  mkCase(
    'day-mismatch: request day differs from on-chain day',
    'day-mismatch',
    defaultState(),
    defaultRequest({ day: new BN(99_999) }),
  ),
  mkCase(
    'day-mismatch: with paused policy still ErrCounterDayMismatch first',
    'day-mismatch',
    defaultState({ policy: { ...defaultState().policy, paused: true } }),
    defaultRequest({ day: new BN(0), amount: new BN(0) }),
  ),
  mkCase(
    'day-mismatch: previous day',
    'day-mismatch',
    defaultState(),
    defaultRequest({ day: NOW_DAY.subn(1) }),
  ),
);

// PRIORITY (multi-failure cases — verifies the simulator reports the FIRST trip) (4)
cases.push(
  mkCase(
    'priority: paused beats expired beats per_tx_cap',
    'priority',
    defaultState({
      policy: {
        ...defaultState().policy,
        paused: true,
        expiryTs: NOW_DAY.muln(SECONDS_PER_DAY).subn(60),
      },
    }),
    defaultRequest({ amount: new BN(999_999_999) }),
  ),
  mkCase(
    'priority: day-mismatch beats paused',
    'priority',
    defaultState({ policy: { ...defaultState().policy, paused: true } }),
    defaultRequest({ day: new BN(0) }),
  ),
  mkCase(
    'priority: expired beats per-tx-cap beats daily-cap',
    'priority',
    defaultState({
      policy: {
        ...defaultState().policy,
        expiryTs: NOW_DAY.muln(SECONDS_PER_DAY).subn(1),
      },
      dailyCounter: { spent: new BN(5_000_000) },
    }),
    defaultRequest({ amount: new BN(999_999) }),
  ),
  mkCase(
    'priority: amount-zero beats per-tx-cap',
    'amount-zero',
    defaultState(),
    defaultRequest({ amount: new BN(0) }),
  ),
);

// PROPERTY-GENERATED (deterministic, seeded ranges) — pad to >= 100
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

const r = rng(0xc0ffee);
for (let i = 0; i < 50; i++) {
  const dailyCap = new BN(Math.floor(r() * 9_000_000) + 1_000_000);
  const perTxCap = new BN(Math.floor(r() * dailyCap.toNumber() * 0.5) + 1);
  const stepUpThreshold = new BN(Math.floor(r() * perTxCap.toNumber()));
  const counterSpent = new BN(Math.floor(r() * dailyCap.toNumber()));
  const amount = new BN(Math.floor(r() * (perTxCap.toNumber() * 1.2)) + 1);
  const recipient = [ALICE, BOB, CARLA, DAVE][Math.floor(r() * 4)]!;
  const allowKeys = [ALICE, BOB, CARLA, DAVE];
  const allowLen = Math.floor(r() * 5); // 0..4 (0 = wildcard)
  const allowlist = allowLen > 0 ? allowKeys.slice(0, allowLen) : [];

  cases.push(
    mkCase(
      `gen[${i}]: dailyCap=${dailyCap}, perTx=${perTxCap}, threshold=${stepUpThreshold}, spent=${counterSpent}, amt=${amount}, allowLen=${allowLen}`,
      'happy', // category isn't asserted; just informational
      defaultState({
        policy: {
          paused: false,
          expiryTs: new BN(0),
          perTxCap,
          dailyCap,
          stepUpThreshold,
          allowlistLen: allowLen,
          allowlist,
          version: 1,
        },
        dailyCounter: { spent: counterSpent },
      }),
      defaultRequest({ amount, recipient, nonce: new BN(i + 100) }),
    ),
  );
}

// ─── Write ──────────────────────────────────────────────────────────
mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
const out = JSON.stringify(
  {
    schemaVersion: 1,
    generatedBy: '@rein/sdk scripts/gen-policy-cases.ts',
    cases,
  },
  null,
  2,
);
writeFileSync(FIXTURE_PATH, out + '\n', 'utf8');

const okCount = cases.filter((c) => c.expected.ok).length;
const failCount = cases.length - okCount;
process.stdout.write(
  `policy-cases.json: ${cases.length} total (${okCount} ok / ${failCount} reject)\n`,
);
process.stdout.write(`written to ${FIXTURE_PATH}\n`);
