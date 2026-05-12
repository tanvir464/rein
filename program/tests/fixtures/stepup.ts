import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

const STEP_UP_SEED = Buffer.from('stepup');

export function deriveStepUpPda(
  vault: PublicKey,
  nonce: BN,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STEP_UP_SEED, vault.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
    programId,
  );
}
