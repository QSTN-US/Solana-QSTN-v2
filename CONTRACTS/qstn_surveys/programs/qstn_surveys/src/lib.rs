use anchor_lang::prelude::*;

declare_id!("E4oWW7TDXgmmWtRdBYohuDQn8b3NAnSTauLwqVwBZNPm");

#[program]
pub mod qstn_surveys {
    use super::*;

    pub fn create_survey(ctx: Context<CreateSurvey>) -> Result<()> {
        let survey = &mut ctx.accounts.survey;
        survey.bump = *ctx.bumps.get("survey").unwrap();
        survey.count = 0;
        Ok(())
    }

    pub fn increment_survey(ctx: Context<IncrementSurvey>) -> Result<()> {
        let survey = &mut ctx.accounts.survey;
        survey.count += 1;
        Ok(())
    }

    pub fn create_reward(ctx: Context<CreateReward>) -> Result<()> {
        let reward = &mut ctx.accounts.reward;
        reward.bump = *ctx.bumps.get("reward").unwrap();
        reward.count = 0;
        Ok(())
    }

    pub fn update_reward(ctx: Context<UpdateReward>) -> Result<()> {
        let reward = &mut ctx.accounts.reward;
        let survey = &mut ctx.accounts.survey;
        reward.count += survey.count - reward.count;
        Ok(())
    }
}

/* -----------------------------------------------------------------
    Survey
   -----------------------------------------------------------------*/
#[account]
pub struct Survey {
    bump: u8,
    count: u8
}

// validation struct
#[derive(Accounts)]
pub struct CreateSurvey<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    // Space Reference: https://book.anchor-lang.com/chapter_5/space.html
    // space: 8 discriminator + 1 bump + 1 count
    #[account(
        init, payer = user, space = 8 + 1 + 1,
        seeds = [b"survey", user.key().as_ref()], bump
    )]
    pub survey: Account<'info, Survey>,
    pub system_program: Program<'info, System>,
}

// validation struct
#[derive(Accounts)]
pub struct IncrementSurvey<'info> {
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"survey", user.key().as_ref()], bump = survey.bump
    )]
    pub survey: Account<'info, Survey>,
}

/* -----------------------------------------------------------------
    Reward
   -----------------------------------------------------------------*/
#[account]
pub struct Reward {
    bump: u8,
    count: u8,
}

// validation struct
#[derive(Accounts)]
pub struct CreateReward<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK:
    pub admin: AccountInfo<'info>,
    // space: 8 discriminator + 1 bump + 1 count
    // seeds: user publickey and admin publickey
    #[account(
        init, payer = user, space = 8 + 1 + 1,
        seeds = [b"reward", user.key().as_ref(), admin.key().as_ref()], bump
    )]
    pub reward: Account<'info, Reward>,
    pub system_program: Program<'info, System>,
}

// validation struct
#[derive(Accounts)]
pub struct UpdateReward<'info> {
    pub user: Signer<'info>,
    /// CHECK:
    pub admin: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"reward", user.key().as_ref(), admin.key().as_ref()], bump = reward.bump
    )]
    pub reward: Account<'info, Reward>,
    #[account(
        mut,
        seeds = [b"survey", user.key().as_ref()], bump = survey.bump
    )]
    pub survey: Account<'info, Survey>,
}
