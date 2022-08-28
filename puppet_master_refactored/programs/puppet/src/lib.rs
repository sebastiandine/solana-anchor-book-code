use anchor_lang::prelude::*;
use std::mem::size_of;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod puppet {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.puppet_account.authority = ctx.accounts.authority_pda.key();
        Ok(())
    }

    pub fn set_data(ctx: Context<SetData>, data: u64) -> Result<()> {
        let puppet_account = &mut ctx.accounts.puppet_account;
        puppet_account.data = data;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, seeds = [b"puppet", authority_pda.key().as_ref()], bump, space = 8 + size_of::<Data>())]
    pub puppet_account: Account<'info, Data>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: this pda will later be able to sign transactions for the new account
    pub authority_pda: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetData<'info> {
    #[account(mut, has_one = authority)]
    pub puppet_account: Account<'info, Data>,
    pub authority: Signer<'info>
}

#[account]
#[derive(Default)]
pub struct Data {
    pub data: u64,
    pub authority: Pubkey
}