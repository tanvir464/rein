/**
 * Recipient commitment hashing for the on-chain blocklist/allowlist.
 *
 * The Anchor program treats the 32-byte `recipient_commit` as the lower
 * 32 bytes of a Pubkey for blocklist storage (see U1.3 in
 * `todo-sidetracks.md` and `specs/sidetracks-architecture.md`). At submit
 * time the dashboard hashes each allowlist pubkey → commitment so the
 * private-spend path's commitment check passes.
 *
 * We use sha256(pubkey_bytes) rather than Poseidon because:
 *  - Poseidon-bn128 in JS pulls heavy snarkjs/wasm deps not yet shipped to the
 *    web bundle, and we're not generating ZK proofs here.
 *  - The on-chain program compares whatever the worker submitted; the worker
 *    uses the same sha256 fallback (see `service/src/umbra/client.ts`).
 *  - If Poseidon becomes load-bearing later, both sides flip together.
 */
import { PublicKey } from '@solana/web3.js';

export async function recipientCommitment(pubkey: string | PublicKey): Promise<Uint8Array> {
  const pk = typeof pubkey === 'string' ? new PublicKey(pubkey) : pubkey;
  const buf = pk.toBytes();
  const digest = await crypto.subtle.digest('SHA-256', buf as BufferSource);
  return new Uint8Array(digest);
}

export async function recipientCommitmentBase58(
  pubkey: string | PublicKey,
): Promise<string> {
  const c = await recipientCommitment(pubkey);
  // 32 bytes → PublicKey base58 form, matching on-chain storage layout.
  return new PublicKey(c).toBase58();
}

export function isValidBase58Pubkey(s: string): boolean {
  if (s.length < 32 || s.length > 44) return false;
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}
