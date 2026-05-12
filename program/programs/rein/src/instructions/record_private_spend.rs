use anchor_lang::prelude::*;

use crate::constants::{
    BLOCKLIST_SEED, COUNTER_SEED, POLICY_SEED, RECEIPT_V2_SEED, STEP_UP_SEED, UMBRA_REF_SEED,
    VAULT_SEED,
};
use crate::errors::ReinError;
use crate::events::PrivateSpendCompleted;
use crate::state::{
    current_day, Blocklist, DailyCounter, Policy, SpendReceipt, StepUpRequest, Vault,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecordPrivateSpendArgs {
    pub amount: u64,
    pub nonce: u64,
    pub recipient_commit: [u8; 32],
    pub umbra_ref: [u8; 32],
    pub day: u64,
}

#[account]
pub struct UmbraRefMarker {
    pub vault: Pubkey,
    pub umbra_ref: [u8; 32],
    pub nonce: u64,
    pub ts: i64,
    pub bump: u8,
}

impl UmbraRefMarker {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

#[derive(Accounts)]
#[instruction(args: RecordPrivateSpendArgs)]
pub struct RecordPrivateSpend<'info> {
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
        init_if_needed,
        payer = payer,
        space = DailyCounter::SIZE,
        seeds = [COUNTER_SEED, vault.key().as_ref(), &args.day.to_le_bytes()],
        bump,
    )]
    pub daily_counter: Box<Account<'info, DailyCounter>>,

    #[account(
        init,
        payer = payer,
        space = SpendReceipt::SIZE,
        seeds = [RECEIPT_V2_SEED, vault.key().as_ref(), &args.nonce.to_le_bytes()],
        bump,
    )]
    pub receipt: Box<Account<'info, SpendReceipt>>,

    /// Anti-replay marker — `init` fails with AccountAlreadyInitialized if this
    /// `umbra_ref` was already recorded for this vault. Cheaper than scanning the
    /// last N receipts, and gives the same security property.
    #[account(
        init,
        payer = payer,
        space = UmbraRefMarker::SIZE,
        seeds = [UMBRA_REF_SEED, vault.key().as_ref(), &args.umbra_ref],
        bump,
    )]
    pub umbra_ref_marker: Box<Account<'info, UmbraRefMarker>>,

    #[account(
        seeds = [BLOCKLIST_SEED, vault.key().as_ref()],
        bump = blocklist.bump,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub blocklist: Box<Account<'info, Blocklist>>,

    pub step_up_request: Option<Box<Account<'info, StepUpRequest>>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RecordPrivateSpend>,
    args: RecordPrivateSpendArgs,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let on_chain_day = current_day(now);

    require!(args.day == on_chain_day, ReinError::ErrCounterDayMismatch);
    require!(args.umbra_ref != [0u8; 32], ReinError::ErrUmbraRefZero);
    require!(
        args.recipient_commit != [0u8; 32],
        ReinError::ErrRecipientCommitZero
    );

    let policy = &ctx.accounts.policy;

    require!(!policy.paused, ReinError::ErrPaused);

    if policy.expiry_ts != 0 {
        require!(now < policy.expiry_ts, ReinError::ErrExpired);
    }

    require!(args.amount > 0, ReinError::ErrAmountZero);
    require!(args.amount <= policy.per_tx_cap, ReinError::ErrPerTxCap);

    // Blocklist matches commitment hashes: a 32-byte recipient_commit is stored
    // as the byte payload of a Pubkey entry in the existing Blocklist PDA.
    let blocklist = &ctx.accounts.blocklist;
    if blocklist.len > 0 {
        let blen = blocklist.len as usize;
        let needle = Pubkey::new_from_array(args.recipient_commit);
        let blocked = blocklist.entries[..blen].iter().any(|k| *k == needle);
        require!(!blocked, ReinError::ErrRecipientCommitBlocked);
    }

    if policy.step_up_threshold > 0 && args.amount > policy.step_up_threshold {
        let req = ctx
            .accounts
            .step_up_request
            .as_ref()
            .ok_or(error!(ReinError::ErrStepUpRequired))?;

        let vault_key = ctx.accounts.vault.key();
        let nonce_bytes = args.nonce.to_le_bytes();
        let (expected_pda, _) = Pubkey::find_program_address(
            &[STEP_UP_SEED, vault_key.as_ref(), &nonce_bytes],
            ctx.program_id,
        );
        require!(req.key() == expected_pda, ReinError::ErrStepUpMismatch);

        require!(req.vault == vault_key, ReinError::ErrStepUpMismatch);
        require!(req.amount == args.amount, ReinError::ErrStepUpMismatch);
        require!(req.nonce == args.nonce, ReinError::ErrStepUpMismatch);
        require!(req.approved, ReinError::ErrStepUpRequired);
        require!(now < req.expires_at, ReinError::ErrStepUpExpired);
    }

    let counter = &mut ctx.accounts.daily_counter;
    if counter.day == 0 && counter.spent == 0 && counter.vault == Pubkey::default() {
        counter.vault = ctx.accounts.vault.key();
        counter.day = on_chain_day;
        counter.bump = ctx.bumps.daily_counter;
    } else {
        require!(
            counter.vault == ctx.accounts.vault.key(),
            ReinError::ErrUnauthorized
        );
        require!(counter.day == on_chain_day, ReinError::ErrCounterDayMismatch);
    }

    let new_spent = counter
        .spent
        .checked_add(args.amount)
        .ok_or(error!(ReinError::ErrOverflow))?;
    require!(new_spent <= policy.daily_cap, ReinError::ErrDailyCap);

    counter.spent = new_spent;

    let receipt = &mut ctx.accounts.receipt;
    receipt.vault = ctx.accounts.vault.key();
    receipt.amount = args.amount;
    receipt.recipient = Pubkey::default();
    receipt.ts = now;
    receipt.policy_version = policy.version;
    receipt.nonce = args.nonce;
    receipt.x402_url_hash = [0u8; 32];
    receipt.bump = ctx.bumps.receipt;
    receipt.disputed = false;
    receipt.confidential = true;
    receipt.recipient_commit = args.recipient_commit;
    receipt.umbra_ref = args.umbra_ref;
    receipt._reserved2 = [0u8; 30];

    let marker = &mut ctx.accounts.umbra_ref_marker;
    marker.vault = ctx.accounts.vault.key();
    marker.umbra_ref = args.umbra_ref;
    marker.nonce = args.nonce;
    marker.ts = now;
    marker.bump = ctx.bumps.umbra_ref_marker;

    emit!(PrivateSpendCompleted {
        receipt: receipt.key(),
        vault: receipt.vault,
        amount: receipt.amount,
        recipient_commit: receipt.recipient_commit,
        umbra_ref: receipt.umbra_ref,
        policy_version: receipt.policy_version,
        day: on_chain_day,
        ts: now,
    });

    Ok(())
}
