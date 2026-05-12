import { ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';

export const DEFAULT_COMPUTE_UNIT_LIMIT = 100_000;
export const DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS = 1_000;

/**
 * Returns the two compute-budget instructions to prepend to a tx:
 *   1. setComputeUnitLimit — caps the CU budget for the spend ix path.
 *   2. setComputeUnitPrice — bids priority lamports for landing.
 *
 * v1 uses static defaults. Helius dynamic estimation is a hook point in v1.x:
 * call out to `helius.getPriorityFeeEstimate({ accountKeys })` and pass the result
 * as `priorityFeeMicroLamports`.
 */
export function buildComputeBudgetIxs(opts: {
  computeUnitLimit?: number;
  priorityFeeMicroLamports?: number;
}): {
  ixs: TransactionInstruction[];
  computeUnitLimit: number;
  priorityFeeMicroLamports: number;
} {
  const computeUnitLimit = opts.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
  const priorityFeeMicroLamports =
    opts.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

  return {
    ixs: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: BigInt(priorityFeeMicroLamports) }),
    ],
    computeUnitLimit,
    priorityFeeMicroLamports,
  };
}
