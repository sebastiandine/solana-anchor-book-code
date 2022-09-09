use anchor_lang::prelude::*;

use anchor_spl::token::{self, Token, Mint, TokenAccount, InitializeAccount};
use anchor_spl::associated_token::{self, AssociatedToken, Create, };

//use anchor_lang::system_program::{self, CreateAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_sale {
    use super::*;

    pub fn purchase(ctx: Context<Purchase>, bump: u8) -> Result<()> {

        let token_account: Result<Account<TokenAccount>> = Account::try_from(&ctx.accounts.token_account.to_account_info());
        match token_account {
            Ok(_) => {},
            Err(_) => {associated_token::create(ctx.accounts.get_create_ata_cpi_ctx());}
        }
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    
    /// CHECK: new token account
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,  // was ist das?
}

impl<'info> Purchase<'info> {
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
}


