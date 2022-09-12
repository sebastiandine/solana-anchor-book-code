use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use anchor_spl::token::{self, Token, Mint, TokenAccount, MintTo};
use anchor_spl::associated_token::{AssociatedToken};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_sale {
    use super::*;

    pub fn purchase(ctx: Context<Purchase>, mint_authority_bump: u8, amount: u64) -> Result<()> {

        // transfer payment to mint authority
        system_program::transfer(ctx.accounts.get_sol_transfer_ctx(), amount)?;

        // mint token in ratio 1:5 based on the amount of SOL payed
        let bump = &[mint_authority_bump];
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[&[b"MINT_AUTHORITY", mint_key.as_ref(), bump][..]];
        token::mint_to(ctx.accounts.get_mint_ctx().with_signer(seeds), amount*5)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(init_if_needed, payer = payer, associated_token::mint = mint,
        associated_token::authority = payer)]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: mint authority. PDA
    #[account(mut, seeds = [b"MINT_AUTHORITY", mint.key().as_ref()], bump)]  // mut because it receives SOL
    pub mint_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>, // mut because supply gets adjusted
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>, 
}


impl<'info> Purchase<'info> {

    pub fn get_sol_transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {

        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.payer.to_account_info(),
            to: self.mint_authority.to_account_info(),
        };
        CpiContext::new(cpi_program, cpi_accounts)
    }

    pub fn get_mint_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {

        let cpi_program =  self.token_program.to_account_info();
        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.token_account.to_account_info(),
            authority: self.mint_authority.to_account_info(),
        };
        CpiContext::new(cpi_program, cpi_accounts)
    }
}


