use anchor_lang::prelude::*;

#[account]
pub struct SpendReceipt {
    pub vault: Pubkey,
    pub amount: u64,
    pub recipient: Pubkey,
    pub ts: i64,
    pub policy_version: u32,
    pub nonce: u64,
    pub x402_url_hash: [u8; 32],
    pub bump: u8,
    pub disputed: bool,
    // Re-uses what was previously the first byte of `_reserved`. A v1 receipt
    // (written before this field existed) deserialises with `confidential = false`
    // because that byte was always written as zero.
    pub confidential: bool,
    pub recipient_commit: [u8; 32],
    pub umbra_ref: [u8; 32],
    pub _reserved2: [u8; 30],
}

impl SpendReceipt {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // vault
        + 8                     // amount
        + 32                    // recipient
        + 8                     // ts
        + 4                     // policy_version
        + 8                     // nonce
        + 32                    // x402_url_hash
        + 1                     // bump
        + 1                     // disputed
        + 1                     // confidential
        + 32                    // recipient_commit
        + 32                    // umbra_ref
        + 30;                   // _reserved2
}
