use anchor_lang::prelude::*;

use crate::constants::{BLOCKLIST_SEED, RECEIPT_SEED, VAULT_SEED};
use crate::errors::ReinError;
use crate::events::SpendDisputed;
use crate::state::{Blocklist, SpendReceipt, Vault, MAX_BLOCKLIST};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DisputeArgs {
    pub nonce: u64,
}

#[derive(Accounts)]
#[instruction(args: DisputeArgs)]
pub struct Dispute<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ ReinError::ErrNotVaultOwner,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        seeds = [RECEIPT_SEED, vault.key().as_ref(), &args.nonce.to_le_bytes()],
        bump = receipt.bump,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub receipt: Box<Account<'info, SpendReceipt>>,

    #[account(
        mut,
        seeds = [BLOCKLIST_SEED, vault.key().as_ref()],
        bump = blocklist.bump,
        has_one = vault @ ReinError::ErrUnauthorized,
    )]
    pub blocklist: Box<Account<'info, Blocklist>>,
}

pub fn handler(ctx: Context<Dispute>, _args: DisputeArgs) -> Result<()> {
    let receipt = &mut ctx.accounts.receipt;
    let blocklist = &mut ctx.accounts.blocklist;
    let recipient = receipt.recipient;

    // Idempotent: already-disputed is fine.
    receipt.disputed = true;

    let len = blocklist.len as usize;
    let already_blocked = blocklist.entries[..len].iter().any(|k| *k == recipient);
    if !already_blocked {
        require!(
            (blocklist.len as usize) < MAX_BLOCKLIST,
            ReinError::ErrBlocklistFull
        );
        let idx = blocklist.len as usize;
        blocklist.entries[idx] = recipient;
        blocklist.len += 1;
    }

    emit!(SpendDisputed {
        receipt: receipt.key(),
        vault: receipt.vault,
        recipient,
        ts: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
