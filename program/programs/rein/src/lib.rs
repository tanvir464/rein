use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::PolicyArgs;

declare_id!("2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj");

#[program]
pub mod rein {
    use super::*;

    pub fn init_vault(ctx: Context<InitVault>) -> Result<()> {
        instructions::init_vault::handler(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn init_policy(ctx: Context<InitPolicy>, args: PolicyArgs) -> Result<()> {
        instructions::init_policy::handler(ctx, args)
    }

    pub fn update_policy(ctx: Context<UpdatePolicy>, args: PolicyArgs) -> Result<()> {
        instructions::update_policy::handler(ctx, args)
    }

    pub fn spend(ctx: Context<Spend>, args: SpendArgs) -> Result<()> {
        instructions::spend::handler(ctx, args)
    }

    pub fn request_step_up(
        ctx: Context<RequestStepUp>,
        args: StepUpRequestArgs,
    ) -> Result<()> {
        instructions::request_step_up::handler(ctx, args)
    }

    pub fn approve_step_up(ctx: Context<ApproveStepUp>) -> Result<()> {
        instructions::approve_step_up::handler(ctx)
    }

    pub fn pause(ctx: Context<Pause>, args: PauseArgs) -> Result<()> {
        instructions::pause::handler(ctx, args)
    }

    pub fn dispute(ctx: Context<Dispute>, args: DisputeArgs) -> Result<()> {
        instructions::dispute::handler(ctx, args)
    }

    pub fn expire_policy(ctx: Context<ExpirePolicy>) -> Result<()> {
        instructions::expire_policy::handler(ctx)
    }

    pub fn record_private_spend(
        ctx: Context<RecordPrivateSpend>,
        args: RecordPrivateSpendArgs,
    ) -> Result<()> {
        instructions::record_private_spend::handler(ctx, args)
    }
}
