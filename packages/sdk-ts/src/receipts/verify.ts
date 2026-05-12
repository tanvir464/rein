import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { deriveReceiptPda } from '../pdas';
import { REIN_PROGRAM_ID } from '../program-id';
import type { Receipt } from '../types';

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Verify a receipt against on-chain state. Three checks:
 *
 * 1. PDA re-derivation: `deriveReceiptPda(vault, nonce)` matches `receipt.id`.
 * 2. Signature exists and references the receipt PDA.
 * 3. (best-effort) Tx contains a REIN program instruction touching the receipt.
 *
 * Pure checks (1) require no RPC. (2) and (3) take an optional `Connection` —
 * pass it for deeper verification, omit for cheap PDA-only sanity.
 */
export async function verifyReceipt(
  receipt: Receipt,
  connection?: Connection,
): Promise<VerifyResult> {
  // (1) PDA re-derivation
  let vaultPk: PublicKey;
  try {
    vaultPk = new PublicKey(receipt.vault);
  } catch {
    return { valid: false, reason: 'receipt.vault is not valid base58' };
  }
  const [expectedPda] = deriveReceiptPda(vaultPk, new BN(receipt.nonce.toString()));
  if (expectedPda.toBase58() !== receipt.id) {
    return {
      valid: false,
      reason: `PDA mismatch: derived ${expectedPda.toBase58()} vs receipt.id ${receipt.id}`,
    };
  }

  if (!connection || !receipt.signature) {
    return { valid: true };
  }

  // (2) + (3) RPC checks
  let tx;
  try {
    tx = await connection.getTransaction(receipt.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
  } catch (e: unknown) {
    return { valid: false, reason: `getTransaction failed: ${(e as Error)?.message ?? e}` };
  }
  if (!tx) {
    return { valid: false, reason: 'transaction not found on chain' };
  }

  const accountKeys = tx.transaction.message.getAccountKeys
    ? tx.transaction.message.getAccountKeys().keySegments().flat()
    : [];
  const referencesReceipt = accountKeys.some((k) => k.equals(expectedPda));
  if (!referencesReceipt) {
    return { valid: false, reason: 'tx does not reference receipt PDA' };
  }

  const referencesProgram = accountKeys.some((k) => k.equals(REIN_PROGRAM_ID));
  if (!referencesProgram) {
    return { valid: false, reason: 'tx does not reference REIN program' };
  }

  return { valid: true };
}
