import { PublicKey } from '@solana/web3.js';

const BLOCKLIST_SEED = Buffer.from('blocklist');

export function deriveBlocklistPda(
  vault: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([BLOCKLIST_SEED, vault.toBuffer()], programId);
}
