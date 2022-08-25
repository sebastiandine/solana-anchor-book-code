import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Blog } from "../target/types/blog";

import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import chai from "chai";
import { expect } from "chai";

import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);


// helper functions
const createWallet = async (connection: anchor.web3.Connection, funds: number) 
: Promise<anchor.web3.Keypair> => {
  const wallet = anchor.web3.Keypair.generate();
  const tx = await connection.requestAirdrop(
    wallet.publicKey,
    anchor.web3.LAMPORTS_PER_SOL * funds
  );
  // wait for confirmation
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx
  });

  // check balance
  const balance = await connection.getBalance(wallet.publicKey);
  if(balance < funds){
    throw new Error("Requested amount exceeds target"+
                    "network's airdrop limit.");
  }
  return wallet;
};

const findBlogPDAforAuthority = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('blog'), authority.toBytes()],
    programId
  );
  return pda;
}

const findPostPDAForBlog = async (programId: anchor.web3.PublicKey, blog: anchor.web3.PublicKey, postCount: anchor.BN): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('post'), blog.toBytes(), postCount.toArray("be", 8)],
    programId
  );
  return pda;
}

const initBlog = async (program: Program<Blog>, authority: anchor.web3.Keypair): Promise<anchor.web3.PublicKey> => {

  const pda = await findBlogPDAforAuthority(program.programId, authority.publicKey);

  await program.methods.initBlog()
    .accounts({blog: pda,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();
  
    return pda;
}

const createPost = async (program: Program<Blog>, authority: anchor.web3.Keypair, postCount: anchor.BN, title: string, content: string): Promise<anchor.web3.PublicKey> => {

  const blogPDA = await findBlogPDAforAuthority(program.programId, authority.publicKey);
  const postPDA = await findPostPDAForBlog(program.programId, blogPDA, postCount);

  await program.methods.createPost(title, content)
  .accounts({blog: blogPDA, 
            authority: authority.publicKey,
            post: postPDA, 
            systemProgram: anchor.web3.SystemProgram.programId
          })
  .signers([authority])
  .rpc();

  return postPDA;
}

const fetchBlog = async (program: Program<Blog>, address: anchor.web3.PublicKey) => { 
  return await program.account.blog.fetch(address);
}

const fetchPost = async (program: Program<Blog>, address: anchor.web3.PublicKey) => { 
  return await program.account.post.fetch(address);
}

// test suite
describe("blog dapp", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  // shared objects
  const program = anchor.workspace.Blog as Program<Blog>;
  const connection = anchor.getProvider().connection;
  let wallet1: anchor.web3.Keypair;
  let wallet2: anchor.web3.Keypair;

  before(async () => {
    wallet1 = await createWallet(connection, 1);
    wallet2 = await createWallet(connection, 1);

    await initBlog(program, wallet1);
  });

  it("Blog is initialized correctly.", async () => {

    const blogPDA = await findBlogPDAforAuthority(program.programId, wallet1.publicKey);
    const blog = await fetchBlog(program, blogPDA);

    expect(blog.authority.equals(wallet1.publicKey)).to.be.true;
    expect(blog.posts.eq(new anchor.BN(0))).to.be.true;
    expect(blog.latest.equals(new anchor.web3.PublicKey(0))).to.be.true;
  });

  it("Initial post is created successfully.", async () => {

    const blogPDA = await findBlogPDAforAuthority(program.programId, wallet1.publicKey);
    const blogBefore = await fetchBlog(program, blogPDA);

    const title = "My first article";
    const content = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";
    const postPDA = await findPostPDAForBlog(program.programId, blogPDA, blogBefore.posts);
    const timestamp = Math.floor(Date.now() / 1000) - 1; // it appears that the network timestamp is 1 second behind the actual time, thefore we need to substract 1 second when we compare
    await createPost(program, wallet1, blogBefore.posts, title, content);

    const blogAfter = await fetchBlog(program, blogPDA);
    expect(blogAfter.authority.equals(wallet1.publicKey)).to.be.true;
    expect(blogAfter.posts.eq(blogBefore.posts.add(new anchor.BN(1)))).to.be.true;
    expect(blogAfter.latest.equals(postPDA)).to.be.true;

    const post = await fetchPost(program, postPDA);
    expect(post.title).to.be.eq(title);
    expect(post.content).to.be.eq(content);
    expect(post.previous.equals(new anchor.web3.PublicKey(0))).to.be.true;
    expect(post.blog.equals(blogPDA)).to.be.true;
    expect(post.timestamp.gte(new anchor.BN(timestamp))).to.be.true;
  });

  it("subsequent posts are generated successfully.", async () => {

    const blogPDA = await findBlogPDAforAuthority(program.programId, wallet1.publicKey);
    const blogBefore = await fetchBlog(program, blogPDA);

    const title = "My second article";
    const content = "bla".repeat(100);

    const postPDA = await findPostPDAForBlog(program.programId, blogPDA, blogBefore.posts);
    const timestamp = Math.floor(Date.now() / 1000) - 1;
    await createPost(program, wallet1, blogBefore.posts, title, content);

    const blogAfter = await fetchBlog(program, blogPDA);
    expect(blogAfter.authority.equals(wallet1.publicKey)).to.be.true;
    expect(blogAfter.posts.eq(blogBefore.posts.add(new anchor.BN(1)))).to.be.true;
    expect(blogAfter.latest.equals(postPDA)).to.be.true;

    const post = await fetchPost(program, postPDA);
    expect(post.title).to.be.eq(title);
    expect(post.content).to.be.eq(content);
    expect(post.previous.equals(blogBefore.latest)).to.be.true;
    expect(post.blog.equals(blogPDA)).to.be.true;
    expect(post.timestamp.gte(new anchor.BN(timestamp))).to.be.true;
  });

  it("Only authority can create posts", async () => {
    const blogPDA = await findBlogPDAforAuthority(program.programId, wallet1.publicKey);
    const blogBefore = await fetchBlog(program, blogPDA);
    const title = "My third article";
    const content = "bla".repeat(100);
    const postPDA = await findPostPDAForBlog(program.programId, blogPDA, blogBefore.posts);
    await expect(program.methods.createPost(title, content)
                  .accounts({blog: blogPDA, 
                            authority: wallet1.publicKey,
                            post: postPDA, 
                            systemProgram: anchor.web3.SystemProgram.programId
                          })
                  .signers([wallet2])
                  .rpc()
          ).to.be.rejected;

    await expect(program.methods.createPost(title, content)
                .accounts({blog: blogPDA, 
                          authority: wallet2.publicKey,
                          post: postPDA, 
                          systemProgram: anchor.web3.SystemProgram.programId
                        })
                .signers([wallet2])
                .rpc()
          ).to.be.rejected;
  });
});