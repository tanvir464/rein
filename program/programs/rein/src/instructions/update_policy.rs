use anchor_lang::prelude::*;

use crate::constants::{POLICY_SEED, VAULT_SEED};
use crate::errors::ReinError;
use crate::events::PolicyUpdated;
use crate::state::{Policy, PolicyArgs, Vault};

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ReinError::ErrNotVaultOwner,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [POLICY_SEED, vault.key().as_ref()],
        bump = policy.bump,
        has_one = owner @ ReinError::ErrUnauthorized,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub policy: Account<'info, Policy>,
}

pub fn handler(ctx: Context<UpdatePolicy>, args: PolicyArgs) -> Result<()> {
    args.validate()?;

    let now = Clock::get()?.unix_timestamp;
    let policy = &mut ctx.accounts.policy;

    let from_version = policy.version;
    let to_version = from_version
        .checked_add(1)
        .ok_or(error!(ReinError::ErrVersionOverflow))?;

    args.write_into(policy);
    policy.version = to_version;
    policy.updated_at = now;

    emit!(PolicyUpdated {
        policy: policy.key(),
        vault: policy.vault,
        from_version,
        to_version,
        ts: now,
    });

    Ok(())
}
