use anchor_lang::prelude::*;

use crate::constants::{STEP_UP_SEED, VAULT_SEED};
use crate::errors::ReinError;
use crate::events::StepUpApproved;
use crate::state::{StepUpRequest, Vault};

#[derive(Accounts)]
pub struct ApproveStepUp<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ReinError::ErrNotVaultOwner,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        seeds = [STEP_UP_SEED, vault.key().as_ref(), &step_up_request.nonce.to_le_bytes()],
        bump = step_up_request.bump,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub step_up_request: Box<Account<'info, StepUpRequest>>,
}

pub fn handler(ctx: Context<ApproveStepUp>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let req = &mut ctx.accounts.step_up_request;

    require!(now < req.expires_at, ReinError::ErrStepUpExpired);

    req.approved = true;

    emit!(StepUpApproved {
        request: req.key(),
        vault: req.vault,
        ts: now,
    });

    Ok(())
}
