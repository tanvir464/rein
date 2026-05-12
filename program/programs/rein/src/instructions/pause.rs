use anchor_lang::prelude::*;

use crate::constants::{POLICY_SEED, VAULT_SEED};
use crate::errors::ReinError;
use crate::events::PolicyPauseChanged;
use crate::state::{Policy, Vault};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PauseArgs {
    pub paused: bool,
}

#[derive(Accounts)]
pub struct Pause<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ReinError::ErrNotVaultOwner,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        seeds = [POLICY_SEED, vault.key().as_ref()],
        bump = policy.bump,
        has_one = owner @ ReinError::ErrUnauthorized,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub policy: Box<Account<'info, Policy>>,
}

pub fn handler(ctx: Context<Pause>, args: PauseArgs) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    policy.paused = args.paused;
    // Intentional: do NOT bump policy.version. Pause is operational, not a rule change.

    emit!(PolicyPauseChanged {
        policy: policy.key(),
        vault: policy.vault,
        paused: args.paused,
        ts: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
