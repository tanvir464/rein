use anchor_lang::prelude::*;

pub const MAX_STEP_UP_TTL: i64 = 86_400; // 24 hours

#[account]
pub struct StepUpRequest {
    pub vault: Pubkey,
    pub amount: u64,
    pub recipient: Pubkey,
    pub nonce: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub approved: bool,
    pub bump: u8,
}

impl StepUpRequest {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // vault
        + 8                     // amount
        + 32                    // recipient
        + 8                     // nonce
        + 8                     // created_at
        + 8                     // expires_at
        + 1                     // approved
        + 1;                    // bump
}
