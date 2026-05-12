import BN from 'bn.js';
import type { PublicKey } from '@solana/web3.js';

export type SimulatorState = {
  policy: {
    paused: boolean;
    expiryTs: BN;
    perTxCap: BN;
    dailyCap: BN;
    stepUpThreshold: BN;
    allowlistLen: number;
    allowlist: PublicKey[];
    version: number;
  };
  blocklist: {
    len: number;
    entries: PublicKey[];
  };
  dailyCounter: {
    spent: BN;
  };
  stepUpRequest:
    | null
    | {
        vault: PublicKey;
        amount: BN;
        recipient: PublicKey;
        nonce: BN;
        expiresAt: BN;
        approved: boolean;
      };
  onChainDay: BN;
};

export type SimulatorRequest = {
  amount: BN;
  recipient: PublicKey;
  nonce: BN;
  day: BN;
};

export type SimReason =
  | 'ErrAmountZero'
  | 'ErrPaused'
  | 'ErrExpired'
  | 'ErrPerTxCap'
  | 'ErrRecipientNotAllowed'
  | 'ErrRecipientBlocked'
  | 'ErrStepUpRequired'
  | 'ErrStepUpExpired'
  | 'ErrStepUpMismatch'
  | 'ErrDailyCap'
  | 'ErrCounterDayMismatch';

export type SimulationResult =
  | { ok: true; willCost: BN; dailySpentAfter: BN }
  | {
      ok: false;
      reason: SimReason;
      suggestedStepUp?: { amount: BN; threshold: BN };
    };

const SECONDS_PER_DAY = 86_400;

/**
 * Off-chain mirror of the F3 `spend` handler. Returns whether the request would
 * succeed against the supplied state.
 *
 * **Asymmetry rule:** may reject what the program would accept (extra caution),
 * but must NEVER accept what the program would reject. Time-based checks are
 * approximated to the day boundary; this can only reject earlier than the
 * program would, never later. Documented in F10-policy-simulator.md §6.
 */
export function simulate(
  state: SimulatorState,
  request: SimulatorRequest,
): SimulationResult {
  // 0. day mismatch — program checks this first in the handler
  if (!request.day.eq(state.onChainDay)) {
    return { ok: false, reason: 'ErrCounterDayMismatch' };
  }

  // 1. paused
  if (state.policy.paused) {
    return { ok: false, reason: 'ErrPaused' };
  }

  // 2. expiry — approximated to day boundary; fail-closed
  if (!state.policy.expiryTs.isZero()) {
    const nowSec = state.onChainDay.muln(SECONDS_PER_DAY);
    if (nowSec.gte(state.policy.expiryTs)) {
      return { ok: false, reason: 'ErrExpired' };
    }
  }

  // 3. per-tx cap (incl. zero check)
  if (request.amount.lten(0)) {
    return { ok: false, reason: 'ErrAmountZero' };
  }
  if (request.amount.gt(state.policy.perTxCap)) {
    return { ok: false, reason: 'ErrPerTxCap' };
  }

  // 4. allowlist (empty = wildcard)
  if (state.policy.allowlistLen > 0) {
    const list = state.policy.allowlist.slice(0, state.policy.allowlistLen);
    const allowed = list.some((k) => k.equals(request.recipient));
    if (!allowed) {
      return { ok: false, reason: 'ErrRecipientNotAllowed' };
    }
  }

  // 4b. blocklist (overrides allowlist on the deny side)
  if (state.blocklist.len > 0) {
    const blocked = state.blocklist.entries
      .slice(0, state.blocklist.len)
      .some((k) => k.equals(request.recipient));
    if (blocked) {
      return { ok: false, reason: 'ErrRecipientBlocked' };
    }
  }

  // 5. step-up
  if (
    state.policy.stepUpThreshold.gtn(0) &&
    request.amount.gt(state.policy.stepUpThreshold)
  ) {
    const req = state.stepUpRequest;
    if (!req) {
      return {
        ok: false,
        reason: 'ErrStepUpRequired',
        suggestedStepUp: {
          amount: request.amount,
          threshold: state.policy.stepUpThreshold,
        },
      };
    }
    if (
      !req.amount.eq(request.amount) ||
      !req.nonce.eq(request.nonce) ||
      !req.recipient.equals(request.recipient)
    ) {
      return { ok: false, reason: 'ErrStepUpMismatch' };
    }
    if (!req.approved) {
      return { ok: false, reason: 'ErrStepUpRequired' };
    }
    const nowSec = state.onChainDay.muln(SECONDS_PER_DAY);
    if (nowSec.gte(req.expiresAt)) {
      return { ok: false, reason: 'ErrStepUpExpired' };
    }
  }

  // 6. daily cap
  const newSpent = state.dailyCounter.spent.add(request.amount);
  if (newSpent.gt(state.policy.dailyCap)) {
    return { ok: false, reason: 'ErrDailyCap' };
  }

  return { ok: true, willCost: request.amount, dailySpentAfter: newSpent };
}
