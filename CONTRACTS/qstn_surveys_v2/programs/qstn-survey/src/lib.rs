use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("8kes5JBfEYSkMHqW2GywAMZWMVJUKPH5yS69DPHAUAQb");

const SURVEY_SEED: &[u8] = b"survey";
const VAULT_SEED: &[u8] = b"vault";

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
    pub fn init_survey(ctx: Context<InitSurvey>, survey_id: u64, controller: Pubkey) -> Result<()> {
        let survey_account = &mut ctx.accounts.survey_account;
        
        survey_account.survey_id = survey_id;
        survey_account.owner = ctx.accounts.caller.key();
        survey_account.controller = controller;

        Ok(())
    }

    /// ### `fund_survey`
    ///
    /// Funds the survey with the specified amount of SOL by transferring funds from the caller's account to the survey's funding account.
    ///
    /// **Parameters:**
    /// - `ctx`: Context of the transaction.
    /// - `amount`: The amount of SOL to fund the survey.
    ///
    pub fn fund_survey(ctx: Context<FundSurvey>, amount: u64) -> Result<()> {
        let from_account = &ctx.accounts.caller;
        let to_account = &mut ctx.accounts.funding_account;

        let transfer_instruction = system_instruction::transfer(
            from_account.key,
            to_account.key,
            amount
        );

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                from_account.to_account_info(),
                to_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;
        Ok(())
    }

    /// ### `register_participant`
    ///
    /// Registers the participant_address as a participant with his zkp claim.
    ///
    /// **Parameters:**
    /// - `ctx`: Context of the transaction.
    /// - `zkp_claim`: ZKP Claim as a string.
    ///
    pub fn register_participant(ctx: Context<RegisterParticipant>, zkp_claim: String) -> Result<()> {
        let caller = &ctx.accounts.caller;

        if caller.key.ne(&ctx.accounts.survey_account.controller) {
            return err!(SurveyErrors::WrongController);
        }

        let acc = &mut ctx.accounts.participation;

        acc.zkp = zkp_claim;

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
    pub fn payout(ctx: Context<PayoutReward>, amount: u64) -> Result<()> {
        let owner = &ctx.accounts.owner;
        let caller = &ctx.accounts.caller;

        if caller.key.ne(&ctx.accounts.survey_account.controller) {
            return err!(SurveyErrors::WrongController);
        }

        let from_account = &mut ctx.accounts.funding_account;  
        let to_account = &mut ctx.accounts.participant_address;

        let transfer_instruction = system_instruction::transfer(
            &from_account.key(),
            &to_account.key,
            amount
        );

        let seeds = [VAULT_SEED, owner.key.as_ref(), &[ctx.bumps.funding_account]];

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                from_account.to_account_info(),
                to_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&seeds],
        )?;
        
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
        ctx.accounts.survey_account.controller = controller;
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
        space = 8 + 8 + 32 + 32,
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
            caller.key().as_ref()
        ],
        bump
    )]
    pub funding_account: SystemAccount<'info>,
    #[account(mut)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// ### `RegisterParticipant`
///
/// - `survey_account`: Survey account.
/// - `participation`: User's participation in the survey.
/// - `participant_address`: Address of the participant
/// - `caller`: Signer account representing the caller.
/// - `owner`: Owner of the survey.
/// - `system_program`: Solana System program.
///
#[derive(Accounts)]
pub struct RegisterParticipant<'info> {
    #[account(
        mut,
        seeds=[
            SURVEY_SEED,
            owner.key().as_ref(),
            &survey_account.survey_id.to_le_bytes(),
        ],
        bump
    )]
    pub survey_account: Account<'info, Survey>,
    #[account(
        init,
        payer = caller,
        space = 8 + Participation::INIT_SPACE,
        seeds=[
            participant_address.key().as_ref(),
        ],
        bump
    )]
    pub participation: Account<'info, Participation>,
    /// CHECK: 
    pub participant_address: AccountInfo<'info>,
    #[account(mut, signer)]
    pub caller: Signer<'info>,
    #[account(mut)]
    pub owner: SystemAccount<'info>,
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
            owner.key().as_ref()
        ],
        bump
    )]
    pub funding_account: SystemAccount<'info>,
    #[account(
        seeds=[
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
        has_one = owner @ SurveyErrors::NotTheOwner,
        seeds=[
            SURVEY_SEED,
            owner.key().as_ref(),
            &survey_account.survey_id.to_le_bytes(),
        ],
        bump
    )]
    pub survey_account: Account<'info, Survey>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

/// ### Survey
///
/// - `owner`: The public key of the account that owns the survey.
/// - `controller`: The public key of the account that controls the survey.
///
#[account]
pub struct Survey {
    pub survey_id: u64,
    pub owner: Pubkey,
    pub controller: Pubkey,
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
    NotTheOwner
}