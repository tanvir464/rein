use anchor_lang::prelude::*;

use crate::errors::ReinError;

// Capped at 16 in v1 because Anchor 0.31's ix encoder hardcodes a 1000-byte buffer
// (`buffer_1.Buffer.alloc(1000)` in `instruction.js`); 32 pubkeys (1024B) overflows it.
// On-chain reservation matches the cap; upgrade path is to grow the array + realloc.
pub const MAX_ALLOWLIST: usize = 16;

#[account]
pub struct Policy {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub version: u32,
    pub daily_cap: u64,
    pub per_tx_cap: u64,
    pub step_up_threshold: u64,
    pub expiry_ts: i64,
    pub paused: bool,
    pub allowlist_len: u8,
    pub allowlist: [Pubkey; MAX_ALLOWLIST],
    pub bump: u8,
    pub created_at: i64,
    pub updated_at: i64,
    pub _reserved: [u8; 64],
}

impl Policy {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // owner
        + 32                    // vault
        + 4                     // version
        + 8                     // daily_cap
        + 8                     // per_tx_cap
        + 8                     // step_up_threshold
        + 8                     // expiry_ts
        + 1                     // paused
        + 1                     // allowlist_len
        + 32 * MAX_ALLOWLIST    // allowlist
        + 1                     // bump
        + 8                     // created_at
        + 8                     // updated_at
        + 64;                   // _reserved
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PolicyArgs {
    pub daily_cap: u64,
    pub per_tx_cap: u64,
    pub step_up_threshold: u64,
    pub expiry_ts: i64,
    pub paused: bool,
    pub allowlist: Vec<Pubkey>,
}

impl PolicyArgs {
    pub fn validate(&self) -> Result<()> {
        require!(
            self.allowlist.len() <= MAX_ALLOWLIST,
            ReinError::ErrAllowlistTooLong
        );
        require!(self.per_tx_cap > 0, ReinError::ErrInvalidPolicy);
        require!(
            self.daily_cap >= self.per_tx_cap,
            ReinError::ErrInvalidPolicy
        );
        if self.expiry_ts != 0 {
            let now = Clock::get()?.unix_timestamp;
            require!(self.expiry_ts > now, ReinError::ErrExpired);
        }
        Ok(())
    }

    pub fn write_into(&self, policy: &mut Policy) {
        policy.daily_cap = self.daily_cap;
        policy.per_tx_cap = self.per_tx_cap;
        policy.step_up_threshold = self.step_up_threshold;
        policy.expiry_ts = self.expiry_ts;
        policy.paused = self.paused;
        policy.allowlist_len = self.allowlist.len() as u8;
        let mut buf = [Pubkey::default(); MAX_ALLOWLIST];
        for (i, k) in self.allowlist.iter().enumerate() {
            buf[i] = *k;
        }
        policy.allowlist = buf;
    }
}
