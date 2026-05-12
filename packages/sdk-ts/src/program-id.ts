import { PublicKey } from '@solana/web3.js';

/**
 * REIN program ID (same on localnet, devnet, and eventually mainnet beta).
 * Single source of truth — must match `declare_id!` in `program/programs/rein/src/lib.rs`
 * and the entries in `program/Anchor.toml`.
 */
export const REIN_PROGRAM_ID = new PublicKey(
  '2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj',
);
