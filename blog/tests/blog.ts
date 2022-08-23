import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Blog } from "../target/types/blog";

import chai from "chai";
import { expect } from "chai";

import chaiAsPromised from "chai-as-promised";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { rpc } from "@project-serum/anchor/dist/cjs/utils";
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
const findPostPDAForAuthority = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey, title: string): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('post'), authority.toBytes(), utf8.encode(title.substring(0,32))],
    programId
  );

  return pda;
}


const initializeBlog = async (program: Program<Blog>, authority: anchor.web3.Keypair): Promise<anchor.web3.PublicKey> => {

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

const createPost = async (program: Program<Blog>, authority: anchor.web3.Keypair, title: string, content: string): Promise<anchor.web3.PublicKey> => {

  const blogPDA = await findBlogPDAforAuthority(program.programId, authority.publicKey);
  const postPDA = await findPostPDAForAuthority(program.programId, authority.publicKey, title);

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

const fetchBlog = async (program: Program<Blog>, authority: anchor.web3.PublicKey) => { 
  return await program.account.blog.fetch(await findBlogPDAforAuthority(program.programId, authority));
}

const fetchPost = async (program: Program<Blog>, address: anchor.web3.PublicKey) => { 
  return await program.account.post.fetch(address);
}

// test suite
describe("hello_world", () => {
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

    await initializeBlog(program, wallet1);
  });

  it("Accounts are initialized correctly.", async () => {

    console.log(wallet1.publicKey.toString());
    let blog = await fetchBlog(program, wallet1.publicKey);
    console.log(blog);

    await createPost(program, wallet1, "a".repeat(30), "b".repeat(500));
    await createPost(program, wallet1, "title2", "hello world 2");

    blog = await fetchBlog(program, wallet1.publicKey);
    console.log(blog);
    const post = await fetchPost(program, blog.latest);
    console.log(post);
    const post2 = await fetchPost(program, post.previous);
    console.log(post2);
    console.log(post2.timestamp.toString());

  });

  // test: post ohne blog


});