/**
 * Private-path policy wrapper around the existing simulator.
 *
 * The on-chain `record_private_spend` ix enforces the same caps, pause, expiry,
 * and (commitment-)blocklist checks as `spend`. We pre-simulate in the worker
 * so that a policy failure rejects before we burn a real Umbra UTXO.
 */
import type { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { simulate, type SimulatorState, type SimReason } from '@rein/sdk';

export type PrivatePolicyResult =
  | { ok: true; policyVersion: number }
  | { ok: false; reason: SimReason };

export function simulatePrivate(
  state: SimulatorState,
  req: { amount: BN; recipient: PublicKey; nonce: BN; day: BN },
): PrivatePolicyResult {
  const r = simulate(state, req);
  if (!r.ok) return { ok: false, reason: r.reason };
  return { ok: true, policyVersion: state.policy.version };
}
