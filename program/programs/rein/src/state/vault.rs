use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub usdc_mint: Pubkey,
    pub bump: u8,
    pub created_at: i64,
    pub _reserved: [u8; 64],
}

impl Vault {
    pub const SIZE: usize = 8  // discriminator
        + 32  // owner
        + 32  // usdc_mint
        + 1   // bump
        + 8   // created_at
        + 64; // _reserved
}
