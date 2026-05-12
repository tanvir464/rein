use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::VAULT_SEED;
use crate::events::VaultInitialized;
use crate::state::Vault;

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = Vault::SIZE,
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault,
    )]
    pub vault_usdc_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let now = Clock::get()?.unix_timestamp;

    vault.owner = ctx.accounts.owner.key();
    vault.usdc_mint = ctx.accounts.usdc_mint.key();
    vault.bump = ctx.bumps.vault;
    vault.created_at = now;
    vault._reserved = [0u8; 64];

    emit!(VaultInitialized {
        vault: vault.key(),
        owner: vault.owner,
        usdc_mint: vault.usdc_mint,
        ts: now,
    });

    Ok(())
}
