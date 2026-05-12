use anchor_lang::prelude::*;

use crate::constants::{POLICY_SEED, VAULT_SEED};
use crate::errors::ReinError;
use crate::events::PolicyExpired;
use crate::state::{Policy, Vault};

#[derive(Accounts)]
pub struct ExpirePolicy<'info> {
    pub caller: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        seeds = [POLICY_SEED, vault.key().as_ref()],
        bump = policy.bump,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub policy: Box<Account<'info, Policy>>,
}

pub fn handler(ctx: Context<ExpirePolicy>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let policy = &mut ctx.accounts.policy;

    require!(policy.expiry_ts != 0, ReinError::ErrNotExpiring);
    require!(now > policy.expiry_ts, ReinError::ErrNotExpired);

    policy.paused = true;

    emit!(PolicyExpired {
        policy: policy.key(),
        vault: policy.vault,
        expired_at: policy.expiry_ts,
        ts: now,
    });

    Ok(())
}
