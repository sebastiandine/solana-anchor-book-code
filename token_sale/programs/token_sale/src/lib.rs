use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use anchor_spl::token::{self, Token, Mint, TokenAccount, MintTo};
use anchor_spl::associated_token::{self, AssociatedToken, Create};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_sale {
    use super::*;

    pub fn purchase(ctx: Context<Purchase>, mint_authority_bump: u8, amount: u64) -> Result<()> {

        // transfer payment to mint authority
        system_program::transfer(ctx.accounts.get_sol_transfer_ctx(), amount)?;

        // check if token account already exisits. if not, generate it
        let token_account: Result<Account<TokenAccount>> = Account::try_from(&ctx.accounts.token_account.to_account_info());
        match token_account {
            Ok(_) => {},
            Err(_) => {associated_token::create(ctx.accounts.get_create_ata_cpi_ctx())?;}
        }

        // mint token in ratio 1:5 based on the amount of SOL payed
        let bump = &[mint_authority_bump];
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[&[b"MINT_AUTHORITY", mint_key.as_ref(), bump][..]];
        token::mint_to(ctx.accounts.get_mint_ctx().with_signer(seeds), amount*5)
    }
}

#[derive(Accounts)]
#[instruction(mint_authority_bump: u8)] 
pub struct Purchase<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: associcated token account. This will be generated if it does not exist.
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// CHECK: mint authority. PDA
    #[account(mut, seeds = [b"MINT_AUTHORITY", mint.key().as_ref()], bump)]  // mut because it receives SOL
    pub mint_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>, // mut because supply gets adjusted
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,  // was ist das?
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

    pub fn get_create_ata_cpi_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Create<'info>> {

        let cpi_program = self.associated_token_program.to_account_info();
        let cpi_accounts = Create {
            payer: self.payer.to_account_info(),
            associated_token: self.token_account.to_account_info(),
            authority: self.payer.to_account_info(),
            mint: self.mint.to_account_info(),
            system_program: self.system_program.to_account_info(),
            token_program: self.token_program.to_account_info(),
            rent: self.rent.to_account_info(),
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


