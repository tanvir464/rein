use anchor_lang::prelude::*;

pub const MAX_BLOCKLIST: usize = 8;

#[account]
pub struct Blocklist {
    pub vault: Pubkey,
    pub len: u8,
    pub entries: [Pubkey; MAX_BLOCKLIST],
    pub bump: u8,
    pub _reserved: [u8; 32],
}

impl Blocklist {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // vault
        + 1                     // len
        + 32 * MAX_BLOCKLIST    // entries (256 B)
        + 1                     // bump
        + 32;                   // _reserved
}
