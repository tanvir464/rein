use anchor_lang::prelude::*;

use crate::constants::{POLICY_SEED, STEP_UP_SEED, VAULT_SEED};
use crate::errors::ReinError;
use crate::events::StepUpRequested;
use crate::state::{Policy, StepUpRequest, Vault, MAX_STEP_UP_TTL};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StepUpRequestArgs {
    pub amount: u64,
    pub recipient: Pubkey,
    pub nonce: u64,
    pub ttl_secs: i64,
}

#[derive(Accounts)]
#[instruction(args: StepUpRequestArgs)]
pub struct RequestStepUp<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        seeds = [POLICY_SEED, vault.key().as_ref()],
        bump = policy.bump,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub policy: Box<Account<'info, Policy>>,

    #[account(
        init,
        payer = payer,
        space = StepUpRequest::SIZE,
        seeds = [STEP_UP_SEED, vault.key().as_ref(), &args.nonce.to_le_bytes()],
        bump,
    )]
    pub step_up_request: Box<Account<'info, StepUpRequest>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RequestStepUp>, args: StepUpRequestArgs) -> Result<()> {
    require!(args.amount > 0, ReinError::ErrAmountZero);

    let policy = &ctx.accounts.policy;

    // The threshold check defines whether step-up is even meaningful.
    require!(
        policy.step_up_threshold > 0 && args.amount > policy.step_up_threshold,
        ReinError::ErrStepUpNotNeeded
    );

    // A request that can never be satisfied is wasted rent.
    require!(args.amount <= policy.per_tx_cap, ReinError::ErrPerTxCap);

    require!(
        args.ttl_secs > 0 && args.ttl_secs <= MAX_STEP_UP_TTL,
        ReinError::ErrStepUpTtlInvalid
    );

    let now = Clock::get()?.unix_timestamp;
    let req = &mut ctx.accounts.step_up_request;

    req.vault = ctx.accounts.vault.key();
    req.amount = args.amount;
    req.recipient = args.recipient;
    req.nonce = args.nonce;
    req.created_at = now;
    req.expires_at = now + args.ttl_secs;
    req.approved = false;
    req.bump = ctx.bumps.step_up_request;

    emit!(StepUpRequested {
        request: req.key(),
        vault: req.vault,
        amount: req.amount,
        recipient: req.recipient,
        nonce: req.nonce,
        expires_at: req.expires_at,
        ts: now,
    });

    Ok(())
}
