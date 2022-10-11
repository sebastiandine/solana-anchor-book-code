use anchor_lang::prelude::*;

use puppet::cpi::accounts::SetData;
use puppet::program::Puppet;
use puppet::Data;

declare_id!("HmbTLCmaGvZhKnn1Zfa1JVnp7vkMV4DYVxPLWBVoN65L");

#[program]
mod puppet_master {
    use super::*;

    pub fn pull_strings(ctx: Context<PullStrings>, bump: u8, data: u64) -> Result<()> {
        let cpi_program = ctx.accounts.puppet_program.to_account_info();
        // create instruction builder struct, this is similar to the Accounts struct
        let cpi_accounts = SetData {
            puppet_account: ctx.accounts.puppet_account.to_account_info(),
            authority: ctx.accounts.master_pda.to_account_info()
        };
        // create cpi context
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        // call function with cpi context and additional parameter
        let master_pda_auth_key = ctx.accounts.authority.key();
        let master_pda_bump = &[bump];
        let seeds = &[&[b"master", master_pda_auth_key.as_ref(), master_pda_bump][..]];
        puppet::cpi::set_data(cpi_ctx.with_signer(seeds), data)        
    }
}

#[derive(Accounts)]
pub struct PullStrings<'info> {
    #[account(mut)]
    pub puppet_account: Account<'info, Data>,
    pub puppet_program: Program<'info, Puppet>,
    #[account(seeds = [b"master", authority.key().as_ref()], bump)]
    /// CHECK: master pda, no further checks required
    pub master_pda: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
}