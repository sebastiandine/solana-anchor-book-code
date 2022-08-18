use anchor_lang::prelude::*;
use std::mem::size_of;

declare_id!("6mi3PrgougeFGizsQmkfga5Z6MnRNa5sbnP8yH7261hN");

#[program]
pub mod hello_world {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.data = 0;
        Ok(())
    }

    pub fn increase(ctx: Context<Update>) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.data += 1;
        Ok(())
    }

    pub fn decrease(ctx: Context<Update>) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        if my_account.data == 0 {
            return Err(error!(ErrorCode::BelowZero));
        }
        my_account.data -= 1;
         Ok(())
    }

    pub fn set(ctx: Context<Update>, value: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.data = value;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init, seeds = [b"account", authority.key().as_ref()], bump, payer = authority, space = 8 + size_of::<MyAccount>())]
    pub my_account: Account<'info, MyAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, seeds = [b"account", authority.key().as_ref()], bump)]
    pub my_account: Account<'info, MyAccount>,

    pub authority: Signer<'info>
}

#[account]
#[derive(Default)]
pub struct MyAccount {
     data: u64
}

#[error_code]
pub enum ErrorCode {
    #[msg("Cannot decrease value 0f 0.")]
     BelowZero,
}




