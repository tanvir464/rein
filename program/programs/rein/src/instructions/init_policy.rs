use anchor_lang::prelude::*;

use crate::constants::{BLOCKLIST_SEED, POLICY_SEED, VAULT_SEED};
use crate::errors::ReinError;
use crate::events::PolicyInitialized;
use crate::state::{Blocklist, Policy, PolicyArgs, Vault, MAX_ALLOWLIST, MAX_BLOCKLIST};

#[derive(Accounts)]
pub struct InitPolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ReinError::ErrNotVaultOwner,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        init,
        payer = owner,
        space = Policy::SIZE,
        seeds = [POLICY_SEED, vault.key().as_ref()],
        bump,
    )]
    pub policy: Box<Account<'info, Policy>>,

    #[account(
        init,
        payer = owner,
        space = Blocklist::SIZE,
        seeds = [BLOCKLIST_SEED, vault.key().as_ref()],
        bump,
    )]
    pub blocklist: Box<Account<'info, Blocklist>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitPolicy>, args: PolicyArgs) -> Result<()> {
    args.validate()?;

    let now = Clock::get()?.unix_timestamp;

    let policy = &mut ctx.accounts.policy;
    policy.owner = ctx.accounts.owner.key();
    policy.vault = ctx.accounts.vault.key();
    policy.version = 1;
    policy.bump = ctx.bumps.policy;
    policy.created_at = now;
    policy.updated_at = now;
    policy._reserved = [0u8; 64];
    policy.allowlist = [Pubkey::default(); MAX_ALLOWLIST];
    args.write_into(policy);

    let blocklist = &mut ctx.accounts.blocklist;
    blocklist.vault = ctx.accounts.vault.key();
    blocklist.len = 0;
    blocklist.entries = [Pubkey::default(); MAX_BLOCKLIST];
    blocklist.bump = ctx.bumps.blocklist;
    blocklist._reserved = [0u8; 32];

    emit!(PolicyInitialized {
        policy: policy.key(),
        vault: policy.vault,
        version: policy.version,
        ts: now,
    });

    Ok(())
}
