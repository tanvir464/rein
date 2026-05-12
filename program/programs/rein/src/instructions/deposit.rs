use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::VAULT_SEED;
use crate::errors::ReinError;
use crate::events::DepositMade;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ReinError::ErrNotVaultOwner,
        has_one = usdc_mint @ ReinError::ErrMintMismatch,
    )]
    pub vault: Account<'info, Vault>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = owner,
    )]
    pub owner_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault,
    )]
    pub vault_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, ReinError::ErrAmountZero);

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.owner_usdc_ata.to_account_info(),
        mint: ctx.accounts.usdc_mint.to_account_info(),
        to: ctx.accounts.vault_usdc_ata.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer_checked(cpi_ctx, amount, ctx.accounts.usdc_mint.decimals)?;

    emit!(DepositMade {
        vault: ctx.accounts.vault.key(),
        amount,
        ts: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
