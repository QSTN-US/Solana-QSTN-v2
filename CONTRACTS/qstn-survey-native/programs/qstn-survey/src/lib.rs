use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("3vEwJbBfTx8CSqFyNuRhUcAkE69Bi7WWWBcB6n35yeQ2");

const SURVEY_SEED: &[u8] = b"survey";
const VAULT_SEED: &[u8] = b"vault";
const PART_SEED: &[u8] = b"part";

#[program]
pub mod qstn_survey {
    use super::*;

    /// ### `init_survey`
    ///
    /// Initializes a new survey account with the provided controller. The caller becomes the owner of the survey.
    ///
    /// **Parameters:**
    /// - `ctx`: Context of the transaction.
    /// - `survey_id`: ID of the survey to generate
    /// - `controller`: The public key of the account that controls the survey payouts (externally owned account).
    ///
    pub fn init_survey(
        ctx: Context<InitSurvey>,
        survey_id: u64,
        survey_uuid: String,
        controller: Pubkey,
        participants_limit: u64,
        reward_amount: u64,
    ) -> Result<()> {
        let survey_account = &mut ctx.accounts.survey_account;

        msg!("init_survey");
        msg!("ID: {}", survey_id);
        msg!("UUID: {}", survey_uuid);
        msg!("Controller: {}", controller);

        survey_account.survey_id = survey_id;
        survey_account.survey_uuid = survey_uuid;
        survey_account.owner = ctx.accounts.caller.key();
        survey_account.controller = controller;
        survey_account.participants_limit = participants_limit;
        survey_account.reward_amount = reward_amount;
        survey_account.participants_count = 0;

        Ok(())
    }

    /// ### `fund_survey`
    ///
    /// Funds the survey with the specified amount of SOL by transferring funds from the caller's account to the survey's funding account and a fee to the controller's account.
    ///
    /// **Parameters:**
    /// - `ctx`: Context of the transaction.
    /// - `amount`: The amount of SOL to fund the survey.
    /// - `fee`: The fee amount of SOL to transfer to the controller's account.
    ///
    pub fn fund_survey(ctx: Context<FundSurvey>, amount: u64, fee: u64) -> Result<()> {
        let survey_account = &ctx.accounts.survey_account;
        let minimum_amount = survey_account.participants_limit * survey_account.reward_amount;

        let from_account = &ctx.accounts.caller;
        let to_account = &mut ctx.accounts.funding_account;
        let controller_account = &ctx.accounts.controller;

        if amount < minimum_amount {
            return err!(SurveyErrors::InsufficientFunds);
        }

        if controller_account.key() != survey_account.controller {
            return err!(SurveyErrors::WrongController);
        }

        let transfer_to_fund_instruction =
            system_instruction::transfer(from_account.key, to_account.key, amount);

        let transfer_to_controller_instruction =
            system_instruction::transfer(from_account.key, controller_account.key, fee);

        anchor_lang::solana_program::program::invoke(
            &transfer_to_fund_instruction,
            &[
                from_account.to_account_info(),
                to_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        anchor_lang::solana_program::program::invoke(
            &transfer_to_controller_instruction,
            &[
                from_account.to_account_info(),
                controller_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!("fund_survey");
        msg!("ID: {}", survey_account.survey_id);
        msg!("UUID: {}", survey_account.survey_uuid);
        msg!("Participants limit: {}", survey_account.participants_limit);
        msg!("Reward Amount: {}", survey_account.reward_amount);
        msg!("Funded Amount: {}", amount);
        msg!("Fee Paid: {}", fee);

        Ok(())
    }

    /// ### `payout`
    ///
    /// Pays out rewards from the survey's funding account to the specified account. It uses a signed transfer instruction.
    ///
    /// **Parameters:**
    /// - `ctx`: Context of the transaction.
    /// - `amount`: The amount of SOL to payout.
    ///
    pub fn payout(ctx: Context<PayoutReward>, zkp_claim: String) -> Result<()> {
        let acc = &mut ctx.accounts.participation;
        acc.zkp = zkp_claim;

        let owner = &ctx.accounts.owner;
        let caller = &ctx.accounts.caller;
        let survey_account_key = ctx.accounts.survey_account.key();
        let survey_account = &mut ctx.accounts.survey_account;
        let amount = survey_account.reward_amount;

        if caller.key() != survey_account.controller {
            return err!(SurveyErrors::WrongController);
        }

        if survey_account.participants_count >= survey_account.participants_limit {
            return err!(SurveyErrors::ParticipantsLimitReached);
        }

        let from_account = &mut ctx.accounts.funding_account;
        let to_account = &mut ctx.accounts.participant_address;

        let transfer_instruction =
            system_instruction::transfer(&from_account.key(), &to_account.key, amount);

        let owner_key = owner.key();
        let seeds = [VAULT_SEED, survey_account_key.as_ref(), owner_key.as_ref(), &[ctx.bumps.funding_account]];

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                from_account.to_account_info(),
                to_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&seeds],
        )?;

        survey_account.participants_count += 1;

        Ok(())
    }

    /// ### `change_controller`
    ///
    /// Changes the controller account eligible to payout rewards.
    ///
    /// **Parameters:**
    /// - `ctx`: Context of the transaction.
    /// - `controller`: The new controller account.
    ///
    pub fn change_controller(ctx: Context<ChangeController>, controller: Pubkey) -> Result<()> {
        let survey_account = &mut ctx.accounts.survey_account;
        let caller = &ctx.accounts.caller;

        if caller.key() != survey_account.controller {
            return err!(SurveyErrors::WrongController);
        }

        ctx.accounts.survey_account.controller = controller;
        Ok(())
    }

    /// ### `emergency_withdraw`
    ///
    /// Withdraws all remaining funds from the funding account to the controller's account in an emergency.
    ///
    /// **Parameters:**
    /// - `ctx`: Context of the transaction.
    ///
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        let survey_account_key = ctx.accounts.survey_account.key();
        let survey_account = &ctx.accounts.survey_account;
        let funding_account = &mut ctx.accounts.funding_account;
        let controller_account = &ctx.accounts.caller;
        let owner_account = ctx.accounts.owner.key();

        if controller_account.key() != survey_account.controller {
            return err!(SurveyErrors::WrongController);
        }

        if owner_account != survey_account.owner {
            return err!(SurveyErrors::NotTheOwner);
        }

        let balance = funding_account.to_account_info().lamports();

        let from_account = &mut ctx.accounts.funding_account;
        let to_account = &mut ctx.accounts.owner;

        let transfer_instruction =
            system_instruction::transfer(&from_account.key(), &to_account.key, balance);

        let seeds = [
            VAULT_SEED,
            survey_account_key.as_ref(),
            owner_account.as_ref(),
            &[ctx.bumps.funding_account],
        ];

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                from_account.to_account_info(),
                to_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&seeds],
        )?;

        msg!("Emergency withdrawal completed. Amount: {}", balance);

        Ok(())
    }
}

/// ### `InitSurvey`
///
/// - `survey_account`: Initialized survey account.
/// - `funding_account`: System owned account for funding the survey.
/// - `caller`: Signer account representing the caller.
/// - `system_program`: Solana System program.
///
#[derive(Accounts)]
#[instruction(survey_id: u64)]
pub struct InitSurvey<'info> {
    #[account(
        init,
        payer = caller,
        space = 8 + 8 + 64 + 4 + 32 + 32 + 8 + 8 + 8,
        seeds=[
            SURVEY_SEED,
            caller.key().as_ref(),
            &survey_id.to_le_bytes(),
        ],
        bump
    )]
    pub survey_account: Account<'info, Survey>,
    #[account(
        mut,
        seeds=[
            VAULT_SEED,
            survey_account.key().as_ref(),
            caller.key().as_ref(),
        ],
        bump
    )]
    pub funding_account: SystemAccount<'info>,
    #[account(mut)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// ### `FundSurvey`
///
/// - `survey_account`: Survey account.
/// - `funding_account`: System owned account for funding the survey.
/// - `controller`: Controller's account to receive the fee.
/// - `caller`: Signer account representing the caller.
/// - `system_program`: Solana System program.
///
#[derive(Accounts)]
pub struct FundSurvey<'info> {
    #[account(
        mut,
        seeds=[
            SURVEY_SEED,
            caller.key().as_ref(),
            &survey_account.survey_id.to_le_bytes(),
        ],
        bump
    )]
    pub survey_account: Account<'info, Survey>,
    #[account(
        mut,
        seeds=[
            VAULT_SEED,
            survey_account.key().as_ref(),
            caller.key().as_ref()
        ],
        bump
    )]
    pub funding_account: SystemAccount<'info>,
    /// CHECK: This field refers to the controller's account
    #[account(mut)]
    pub controller: AccountInfo<'info>,
    #[account(mut)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// ### `PayoutReward`
///
/// - `survey_account`: Survey account.
/// - `funding_account`: System owned account for funding the survey.
/// - `caller`: Signer account representing the caller.
/// - `to_account`: Address to receive the payout.
/// - `system_program`: Solana System program.
///
#[derive(Accounts)]
pub struct PayoutReward<'info> {
    #[account(
        mut,
        seeds=[
            SURVEY_SEED,
            owner.key().as_ref(),
            &survey_account.survey_id.to_le_bytes(),
        ],
        bump,
    )]
    pub survey_account: Account<'info, Survey>,
    #[account(
        mut,
        seeds=[
            VAULT_SEED,
            survey_account.key().as_ref(),
            owner.key().as_ref()
        ],
        bump
    )]
    pub funding_account: SystemAccount<'info>,
    #[account(
        init,
        payer = caller,
        space = 8 + Participation::INIT_SPACE,
        seeds=[
            PART_SEED,
            survey_account.key().as_ref(),
            participant_address.key().as_ref(),
        ],
        bump
    )]
    pub participation: Account<'info, Participation>,
    /// CHECK: participant address for payout
    #[account(mut)]
    pub participant_address: AccountInfo<'info>,
    /// CHECK: owner account
    pub owner: AccountInfo<'info>,
    #[account(mut, signer)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// ### `ChangeController`
///
/// - `survey_account`: Survey account.
/// - `owner`: Signer account representing the owner.
///
#[derive(Accounts)]
pub struct ChangeController<'info> {
    #[account(
        mut,
        seeds=[
            SURVEY_SEED,
            owner.key().as_ref(),
            &survey_account.survey_id.to_le_bytes(),
        ],
        bump,
    )]
    pub survey_account: Account<'info, Survey>,
    /// CHECK: owner account
    pub owner: AccountInfo<'info>,
    #[account(mut, signer)]
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        mut,
        seeds=[
            SURVEY_SEED,
            owner.key().as_ref(),
            &survey_account.survey_id.to_le_bytes(),
        ],
        bump,
    )]
    pub survey_account: Account<'info, Survey>,
    #[account(
        mut,
        seeds=[
            VAULT_SEED,
            survey_account.key().as_ref(),
            owner.key().as_ref()
        ],
        bump
    )]
    pub funding_account: SystemAccount<'info>,
    /// CHECK: owner account
    #[account(mut)]
    pub owner: AccountInfo<'info>,
    #[account(mut, signer)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// ### Survey
///
/// - `owner`: The public key of the account that owns the survey.
/// - `controller`: The public key of the account that controls the survey.
///
#[account]
pub struct Survey {
    pub survey_id: u64,
    pub survey_uuid: String,
    pub owner: Pubkey,
    pub controller: Pubkey,
    pub participants_limit: u64,
    pub reward_amount: u64,
    pub participants_count: u64,
}

/// ### Participation
///
/// - `zkp`: ZKP Claim of the survey user.
///
#[account]
#[derive(InitSpace)]
pub struct Participation {
    #[max_len(128)]
    pub zkp: String,
}

#[error_code]
pub enum SurveyErrors {
    #[msg("Caller is not survey controller")]
    WrongController,
    #[msg("Not the owner")]
    NotTheOwner,
    #[msg("Insufficient funds for funding survey")]
    InsufficientFunds,
    #[msg("Participants limit reached")]
    ParticipantsLimitReached,
}