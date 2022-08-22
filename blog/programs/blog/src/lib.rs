use anchor_lang::prelude::*;
use std::mem::size_of; // !!! doku

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod blog {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn create_post(ctx: Context<CreatePost>, title: String, content: String) -> Result<()> {
        let blog = &mut ctx.accounts.blog;
        let post = &mut ctx.accounts.post;

        post.previous = blog.latest;
        post.title = title;
        post.content = content;
        post.timestamp = Clock::get().unwrap().unix_timestamp;

        blog.latest = post.key();
        blog.posts += 1;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init, seeds = [b"blog", authority.key().as_ref()], bump, payer = authority, space = 8 + size_of::<Blog>())]
    pub blog: Account<'info, Blog>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String, content: String)] //https://docs.rs/anchor-lang/latest/anchor_lang/derive.Accounts.html
pub struct CreatePost<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, seeds = [b"blog", authority.key().as_ref()], bump)]
    pub blog: Account<'info, Blog>,

    #[account(init, seeds = [b"post", authority.key().as_ref(), title.as_ref()], bump, payer = authority, space = 8 + size_of::<Post>() + title.len() + content.len())] 
    pub post: Account<'info, Post>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Blog {
    latest: Pubkey,
    posts: u64
}

#[account]
#[derive(Default)]
pub struct Post {
    title: String,
    content: String, // oder &str
    timestamp: i64,
    previous: Pubkey   
}
