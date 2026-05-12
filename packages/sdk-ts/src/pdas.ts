import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { REIN_PROGRAM_ID } from './program-id';
import {
  BLOCKLIST_SEED,
  COUNTER_SEED,
  POLICY_SEED,
  RECEIPT_SEED,
  RECEIPT_V2_SEED,
  STEP_UP_SEED,
  UMBRA_REF_SEED,
  VAULT_SEED,
} from './seeds';

function u64Le(n: BN): Buffer {
  return n.toArrayLike(Buffer, 'le', 8);
}

export function deriveVaultPda(
  owner: PublicKey,
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_SEED, owner.toBuffer()], programId);
}

export function derivePolicyPda(
  vault: PublicKey,
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([POLICY_SEED, vault.toBuffer()], programId);
}

export function deriveBlocklistPda(
  vault: PublicKey,
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([BLOCKLIST_SEED, vault.toBuffer()], programId);
}

export function deriveCounterPda(
  vault: PublicKey,
  day: BN,
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [COUNTER_SEED, vault.toBuffer(), u64Le(day)],
    programId,
  );
}

export function deriveReceiptPda(
  vault: PublicKey,
  nonce: BN,
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RECEIPT_SEED, vault.toBuffer(), u64Le(nonce)],
    programId,
  );
}

export function deriveStepUpPda(
  vault: PublicKey,
  nonce: BN,
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STEP_UP_SEED, vault.toBuffer(), u64Le(nonce)],
    programId,
  );
}

export function deriveReceiptV2Pda(
  vault: PublicKey,
  nonce: BN,
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [RECEIPT_V2_SEED, vault.toBuffer(), u64Le(nonce)],
    programId,
  );
}

export function deriveUmbraRefMarkerPda(
  vault: PublicKey,
  umbraRef: Uint8Array | number[],
  programId: PublicKey = REIN_PROGRAM_ID,
): [PublicKey, number] {
  const ref = Buffer.from(umbraRef);
  if (ref.length !== 32) {
    throw new RangeError(`umbra_ref must be 32 bytes, got ${ref.length}`);
  }
  return PublicKey.findProgramAddressSync(
    [UMBRA_REF_SEED, vault.toBuffer(), ref],
    programId,
  );
}
