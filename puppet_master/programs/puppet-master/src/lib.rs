use anchor_lang::prelude::*;

use puppet::cpi::accounts::SetData;
use puppet::program::Puppet;
use puppet::Data;

declare_id!("HmbTLCmaGvZhKnn1Zfa1JVnp7vkMV4DYVxPLWBVoN65L");

#[program]
mod puppet_master {
    use super::*;

    pub fn pull_strings(ctx: Context<PullStrings>, data: u64) -> Result<()> {
        let cpi_program = ctx.accounts.puppet_program.to_account_info();
        // create instruction builder struct, this is similar to the Accounts struct
        let cpi_accounts = SetData {
            puppet_account: ctx.accounts.puppet_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info()
        };
        // create cpi context
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        // call function with cpi context and additional parameter
        puppet::cpi::set_data(cpi_ctx, data)
    }
}

#[derive(Accounts)]
pub struct PullStrings<'info> {
    #[account(mut)]
    pub puppet_account: Account<'info, Data>,
    pub puppet_program: Program<'info, Puppet>,
    pub authority: Signer<'info>,
}