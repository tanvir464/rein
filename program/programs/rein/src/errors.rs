use anchor_lang::prelude::*;

#[error_code]
pub enum ReinError {
    // F1 — Vault
    #[msg("amount must be greater than zero")]
    ErrAmountZero,
    #[msg("vault owner does not match signer")]
    ErrNotVaultOwner,
    #[msg("usdc mint does not match vault binding")]
    ErrMintMismatch,

    // F2 — Policy
    #[msg("signer is not authorized for this policy")]
    ErrUnauthorized,
    #[msg("allowlist exceeds max size of 16")]
    ErrAllowlistTooLong,
    #[msg("policy invariants violated (per_tx_cap > 0; daily_cap >= per_tx_cap)")]
    ErrInvalidPolicy,
    #[msg("policy version overflow")]
    ErrVersionOverflow,
    #[msg("policy expired or expiry in the past")]
    ErrExpired,

    // F3 — Spend
    #[msg("amount exceeds per-transaction cap")]
    ErrPerTxCap,
    #[msg("amount would exceed daily cap")]
    ErrDailyCap,
    #[msg("recipient is not in policy allowlist")]
    ErrRecipientNotAllowed,
    #[msg("vault is paused")]
    ErrPaused,
    #[msg("amount exceeds step-up threshold; owner approval required")]
    ErrStepUpRequired,
    #[msg("arithmetic overflow")]
    ErrOverflow,
    #[msg("daily counter day mismatch")]
    ErrCounterDayMismatch,

    // F5 — Step-up
    #[msg("amount is below step-up threshold; request not needed")]
    ErrStepUpNotNeeded,
    #[msg("step-up request expired")]
    ErrStepUpExpired,
    #[msg("step-up approval does not match this spend (vault/amount/recipient/nonce)")]
    ErrStepUpMismatch,
    #[msg("ttl_secs must be > 0 and <= 86400")]
    ErrStepUpTtlInvalid,

    // F6 — Pause / Dispute / Expire
    #[msg("blocklist is full (max 8)")]
    ErrBlocklistFull,
    #[msg("recipient is blocked by a prior dispute")]
    ErrRecipientBlocked,
    #[msg("policy has no expiry; cannot force-expire")]
    ErrNotExpiring,
    #[msg("policy has not yet reached its expiry")]
    ErrNotExpired,

    // U1 — Umbra private spend
    #[msg("umbra_ref reused; anti-replay guard")]
    ErrUmbraRefReused,
    #[msg("umbra_ref must be non-zero")]
    ErrUmbraRefZero,
    #[msg("recipient_commit must be non-zero")]
    ErrRecipientCommitZero,
    #[msg("recipient commit is blocked by a prior dispute")]
    ErrRecipientCommitBlocked,
}
