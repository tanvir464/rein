import type { Program } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import type { Rein } from '../idl';
import type { SimulatorState } from '../policy';
import {
  deriveBlocklistPda,
  deriveCounterPda,
  derivePolicyPda,
  deriveStepUpPda,
} from '../pdas';

/**
 * Read all state needed by the policy simulator off-chain. Single round-trip:
 * issues parallel `program.account.<x>.fetchNullable()` calls so missing
 * accounts (e.g. counter not yet initialized for today, no step-up request)
 * resolve to `null` instead of throwing.
 *
 * `nowSec` should be the on-chain `Clock`-equivalent — typically derived from
 * `connection.getBlockTime(getSlot('confirmed'))`. It feeds `onChainDay` and
 * the boundary checks in the simulator.
 */
export async function loadSimulatorState(
  program: Program<Rein>,
  vault: PublicKey,
  nonce: BN,
  nowSec: number,
): Promise<SimulatorState> {
  const programId = program.programId;
  const [policyPda] = derivePolicyPda(vault, programId);
  const [blocklistPda] = deriveBlocklistPda(vault, programId);
  const onChainDay = new BN(Math.floor(nowSec / 86_400));
  const [counterPda] = deriveCounterPda(vault, onChainDay, programId);
  const [stepUpPda] = deriveStepUpPda(vault, nonce, programId);

  const [policyRaw, blocklistRaw, counterRaw, stepUpRaw] = await Promise.all([
    program.account.policy.fetch(policyPda),
    program.account.blocklist.fetch(blocklistPda),
    program.account.dailyCounter.fetchNullable(counterPda),
    program.account.stepUpRequest.fetchNullable(stepUpPda),
  ]);

  return {
    policy: {
      paused: policyRaw.paused,
      expiryTs: policyRaw.expiryTs as BN,
      perTxCap: policyRaw.perTxCap as BN,
      dailyCap: policyRaw.dailyCap as BN,
      stepUpThreshold: policyRaw.stepUpThreshold as BN,
      allowlistLen: policyRaw.allowlistLen as number,
      allowlist: policyRaw.allowlist as PublicKey[],
      version: policyRaw.version as number,
    },
    blocklist: {
      len: blocklistRaw.len as number,
      entries: blocklistRaw.entries as PublicKey[],
    },
    dailyCounter: {
      spent: counterRaw ? (counterRaw.spent as BN) : new BN(0),
    },
    stepUpRequest: stepUpRaw
      ? {
          vault: stepUpRaw.vault as PublicKey,
          amount: stepUpRaw.amount as BN,
          recipient: stepUpRaw.recipient as PublicKey,
          nonce: stepUpRaw.nonce as BN,
          expiresAt: stepUpRaw.expiresAt as BN,
          approved: stepUpRaw.approved as boolean,
        }
      : null,
    onChainDay,
  };
}
