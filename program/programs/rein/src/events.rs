use anchor_lang::prelude::*;

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub usdc_mint: Pubkey,
    pub ts: i64,
}

#[event]
pub struct DepositMade {
    pub vault: Pubkey,
    pub amount: u64,
    pub ts: i64,
}

#[event]
pub struct PolicyInitialized {
    pub policy: Pubkey,
    pub vault: Pubkey,
    pub version: u32,
    pub ts: i64,
}

#[event]
pub struct PolicyUpdated {
    pub policy: Pubkey,
    pub vault: Pubkey,
    pub from_version: u32,
    pub to_version: u32,
    pub ts: i64,
}

#[event]
pub struct SpendCompleted {
    pub receipt: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
    pub recipient: Pubkey,
    pub policy_version: u32,
    pub day: u64,
    pub ts: i64,
}

#[event]
pub struct StepUpRequested {
    pub request: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
    pub recipient: Pubkey,
    pub nonce: u64,
    pub expires_at: i64,
    pub ts: i64,
}

#[event]
pub struct StepUpApproved {
    pub request: Pubkey,
    pub vault: Pubkey,
    pub ts: i64,
}

#[event]
pub struct PolicyPauseChanged {
    pub policy: Pubkey,
    pub vault: Pubkey,
    pub paused: bool,
    pub ts: i64,
}

#[event]
pub struct SpendDisputed {
    pub receipt: Pubkey,
    pub vault: Pubkey,
    pub recipient: Pubkey,
    pub ts: i64,
}

#[event]
pub struct PolicyExpired {
    pub policy: Pubkey,
    pub vault: Pubkey,
    pub expired_at: i64,
    pub ts: i64,
}

#[event]
pub struct PrivateSpendCompleted {
    pub receipt: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
    pub recipient_commit: [u8; 32],
    pub umbra_ref: [u8; 32],
    pub policy_version: u32,
    pub day: u64,
    pub ts: i64,
}
