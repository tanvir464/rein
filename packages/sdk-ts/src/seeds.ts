// Seed strings consumed by the on-chain program. Must match `program/programs/rein/src/constants.rs`
// byte-for-byte. Exported as Buffers (ready to feed into PublicKey.findProgramAddressSync).

export const VAULT_SEED: Buffer = Buffer.from('vault');
export const POLICY_SEED: Buffer = Buffer.from('policy');
export const BLOCKLIST_SEED: Buffer = Buffer.from('blocklist');
export const COUNTER_SEED: Buffer = Buffer.from('counter');
export const RECEIPT_SEED: Buffer = Buffer.from('receipt');
export const STEP_UP_SEED: Buffer = Buffer.from('stepup');
export const RECEIPT_V2_SEED: Buffer = Buffer.from('receipt-v2');
export const UMBRA_REF_SEED: Buffer = Buffer.from('umbraref');
