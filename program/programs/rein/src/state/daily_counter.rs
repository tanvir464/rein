use anchor_lang::prelude::*;

pub const SECONDS_PER_DAY: i64 = 86_400;

#[account]
pub struct DailyCounter {
    pub vault: Pubkey,
    pub day: u64,
    pub spent: u64,
    pub bump: u8,
}

impl DailyCounter {
    pub const SIZE: usize = 8   // discriminator
        + 32                    // vault
        + 8                     // day
        + 8                     // spent
        + 1;                    // bump
}

pub fn current_day(now: i64) -> u64 {
    (now / SECONDS_PER_DAY) as u64
}
