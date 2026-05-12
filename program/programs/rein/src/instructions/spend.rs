use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::{
    BLOCKLIST_SEED, COUNTER_SEED, POLICY_SEED, RECEIPT_SEED, STEP_UP_SEED, VAULT_SEED,
};
use crate::errors::ReinError;
use crate::events::SpendCompleted;
use crate::state::{
    current_day, Blocklist, DailyCounter, Policy, SpendReceipt, StepUpRequest, Vault,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SpendArgs {
    pub amount: u64,
    pub nonce: u64,
    pub x402_url_hash: [u8; 32],
    /// Day index (unix_ts / 86_400) used to derive the daily counter PDA.
    /// Caller computes this client-side and passes it; the handler verifies it
    /// matches the on-chain clock to within ±1 day (boundary tolerance).
    pub day: u64,
}

#[derive(Accounts)]
#[instruction(args: SpendArgs)]
pub struct Spend<'info> {
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

    #[account(address = vault.usdc_mint @ ReinError::ErrMintMismatch)]
    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = vault,
    )]
    pub vault_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = usdc_mint,
    )]
    pub recipient_usdc_ata: Box<Account<'info, TokenAccount>>,

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
        seeds = [RECEIPT_SEED, vault.key().as_ref(), &args.nonce.to_le_bytes()],
        bump,
    )]
    pub receipt: Box<Account<'info, SpendReceipt>>,

    #[account(
        seeds = [BLOCKLIST_SEED, vault.key().as_ref()],
        bump = blocklist.bump,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub blocklist: Box<Account<'info, Blocklist>>,

    /// Optional. Required when `args.amount > policy.step_up_threshold`.
    /// PDA derivation + (vault, amount, recipient, nonce) match validated inside the handler
    /// (Anchor's `seeds`/`bump` macros don't compose cleanly with `Option<Box<Account<T>>>`,
    /// so we re-derive manually below — same security property, just expressed in code).
    pub step_up_request: Option<Box<Account<'info, StepUpRequest>>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Spend>, args: SpendArgs) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let on_chain_day = current_day(now);

    // Day tolerance: caller's `day` must match on-chain day exactly.
    // The ±1 tolerance is left out of v1 — clients re-derive PDAs at submission time
    // and will retry on the next-day counter if the boundary is crossed mid-flight.
    require!(
        args.day == on_chain_day,
        ReinError::ErrCounterDayMismatch
    );

    let policy = &ctx.accounts.policy;

    // (1) paused
    require!(!policy.paused, ReinError::ErrPaused);

    // (2) expiry
    if policy.expiry_ts != 0 {
        require!(now < policy.expiry_ts, ReinError::ErrExpired);
    }

    // (3) per-tx cap (incl. zero check)
    require!(args.amount > 0, ReinError::ErrAmountZero);
    require!(args.amount <= policy.per_tx_cap, ReinError::ErrPerTxCap);

    // (4) allowlist (empty = wildcard)
    let recipient_key = ctx.accounts.recipient_usdc_ata.key();
    if policy.allowlist_len > 0 {
        let len = policy.allowlist_len as usize;
        let allowed = policy.allowlist[..len].iter().any(|k| *k == recipient_key);
        require!(allowed, ReinError::ErrRecipientNotAllowed);
    }

    // (4b) blocklist (F6) — overrides allowlist
    let blocklist = &ctx.accounts.blocklist;
    if blocklist.len > 0 {
        let blen = blocklist.len as usize;
        let blocked = blocklist.entries[..blen].iter().any(|k| *k == recipient_key);
        require!(!blocked, ReinError::ErrRecipientBlocked);
    }

    // (5) step-up — bypass via approved StepUpRequest if attached (F5).
    if policy.step_up_threshold > 0 && args.amount > policy.step_up_threshold {
        let req = ctx
            .accounts
            .step_up_request
            .as_ref()
            .ok_or(error!(ReinError::ErrStepUpRequired))?;

        // Re-derive the PDA so the caller can't pass an arbitrary StepUpRequest account.
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
        require!(req.recipient == recipient_key, ReinError::ErrStepUpMismatch);
        require!(req.approved, ReinError::ErrStepUpRequired);
        require!(now < req.expires_at, ReinError::ErrStepUpExpired);
    }

    // (6) daily cap — counter is init_if_needed; ensure day binding is correct
    let counter = &mut ctx.accounts.daily_counter;
    if counter.day == 0 && counter.spent == 0 && counter.vault == Pubkey::default() {
        // Freshly initialized; populate.
        counter.vault = ctx.accounts.vault.key();
        counter.day = on_chain_day;
        counter.bump = ctx.bumps.daily_counter;
    } else {
        // Existing counter — must be for the same vault + day.
        require!(counter.vault == ctx.accounts.vault.key(), ReinError::ErrUnauthorized);
        require!(counter.day == on_chain_day, ReinError::ErrCounterDayMismatch);
    }

    let new_spent = counter
        .spent
        .checked_add(args.amount)
        .ok_or(error!(ReinError::ErrOverflow))?;
    require!(new_spent <= policy.daily_cap, ReinError::ErrDailyCap);

    // (7) state mutations + CPI
    counter.spent = new_spent;

    let receipt = &mut ctx.accounts.receipt;
    receipt.vault = ctx.accounts.vault.key();
    receipt.amount = args.amount;
    receipt.recipient = recipient_key;
    receipt.ts = now;
    receipt.policy_version = policy.version;
    receipt.nonce = args.nonce;
    receipt.x402_url_hash = args.x402_url_hash;
    receipt.bump = ctx.bumps.receipt;
    receipt.disputed = false;
    receipt.confidential = false;
    receipt.recipient_commit = [0u8; 32];
    receipt.umbra_ref = [0u8; 32];
    receipt._reserved2 = [0u8; 30];

    // CPI transfer_checked: vault PDA signs.
    let owner_key = ctx.accounts.vault.owner;
    let vault_bump = ctx.accounts.vault.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, owner_key.as_ref(), &[vault_bump]]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.vault_usdc_ata.to_account_info(),
        mint: ctx.accounts.usdc_mint.to_account_info(),
        to: ctx.accounts.recipient_usdc_ata.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer_checked(cpi_ctx, args.amount, ctx.accounts.usdc_mint.decimals)?;

    emit!(SpendCompleted {
        receipt: receipt.key(),
        vault: receipt.vault,
        amount: receipt.amount,
        recipient: receipt.recipient,
        policy_version: receipt.policy_version,
        day: on_chain_day,
        ts: now,
    });

    Ok(())
}
