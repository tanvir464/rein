import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { simulate, type SimulatorRequest, type SimulatorState } from '../../src';

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
  stepUpRequest:
    | null
    | {
        vault: string;
        amount: string;
        recipient: string;
        nonce: string;
        expiresAt: string;
        approved: boolean;
      };
  onChainDay: string;
};
type WireRequest = { amount: string; recipient: string; nonce: string; day: string };
type WireExpected =
  | { ok: true; willCost: string; dailySpentAfter: string }
  | { ok: false; reason: string; suggestedStepUp?: { amount: string; threshold: string } };

type Case = {
  name: string;
  category: string;
  state: WireState;
  request: WireRequest;
  expected: WireExpected;
};

type Bundle = { schemaVersion: number; cases: Case[] };

const FIXTURE = join(
  __dirname,
  '../../../../specs/features/F16-fixtures/policy-cases.json',
);

function deserializeState(w: WireState): SimulatorState {
  return {
    policy: {
      paused: w.policy.paused,
      expiryTs: new BN(w.policy.expiryTs),
      perTxCap: new BN(w.policy.perTxCap),
      dailyCap: new BN(w.policy.dailyCap),
      stepUpThreshold: new BN(w.policy.stepUpThreshold),
      allowlistLen: w.policy.allowlistLen,
      allowlist: w.policy.allowlist.map((k) => new PublicKey(k)),
      version: w.policy.version,
    },
    blocklist: {
      len: w.blocklist.len,
      entries: w.blocklist.entries.map((k) => new PublicKey(k)),
    },
    dailyCounter: { spent: new BN(w.dailyCounter.spent) },
    stepUpRequest: w.stepUpRequest
      ? {
          vault: new PublicKey(w.stepUpRequest.vault),
          amount: new BN(w.stepUpRequest.amount),
          recipient: new PublicKey(w.stepUpRequest.recipient),
          nonce: new BN(w.stepUpRequest.nonce),
          expiresAt: new BN(w.stepUpRequest.expiresAt),
          approved: w.stepUpRequest.approved,
        }
      : null,
    onChainDay: new BN(w.onChainDay),
  };
}

function deserializeRequest(w: WireRequest): SimulatorRequest {
  return {
    amount: new BN(w.amount),
    recipient: new PublicKey(w.recipient),
    nonce: new BN(w.nonce),
    day: new BN(w.day),
  };
}

const bundle = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Bundle;

describe('policy-cases parity (TS simulator)', () => {
  it('fixture file is at schemaVersion 1 with ≥100 cases', () => {
    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.cases.length).toBeGreaterThanOrEqual(100);
  });

  for (const c of bundle.cases) {
    it(`case: ${c.name}`, () => {
      const state = deserializeState(c.state);
      const request = deserializeRequest(c.request);
      const got = simulate(state, request);

      if (c.expected.ok) {
        expect(got.ok, `case ${c.name} expected ok`).toBe(true);
        if (got.ok) {
          expect(got.willCost.toString()).toBe(c.expected.willCost);
          expect(got.dailySpentAfter.toString()).toBe(c.expected.dailySpentAfter);
        }
      } else {
        expect(got.ok, `case ${c.name} expected reject`).toBe(false);
        if (!got.ok) {
          expect(got.reason).toBe(c.expected.reason);
          if (c.expected.suggestedStepUp) {
            expect(got.suggestedStepUp?.amount.toString()).toBe(
              c.expected.suggestedStepUp.amount,
            );
            expect(got.suggestedStepUp?.threshold.toString()).toBe(
              c.expected.suggestedStepUp.threshold,
            );
          }
        }
      }
    });
  }
});
