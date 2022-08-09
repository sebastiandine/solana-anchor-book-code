import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { HelloWorld } from "../target/types/hello_world";

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

const initializeAccount = async (program: Program<HelloWorld>, authority: anchor.web3.Keypair): Promise<anchor.web3.PublicKey> => {

  const accountKeypair = anchor.web3.Keypair.generate();

  await program.methods.initialize()
    .accounts({myAccount: accountKeypair.publicKey,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority, accountKeypair])
    .rpc();
  
    return accountKeypair.publicKey;

}

const getAllAccountsByAuthority = async (accounts: anchor.AccountClient<HelloWorld>, authority: anchor.web3.PublicKey) => {
  return await accounts.all([
    {
      memcmp: {
        offset: 8,
        bytes: authority.toBase58()
      }
    }
  ]);
}

// test suite
describe("hello_world", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  // shared objects
  const program = anchor.workspace.HelloWorld as Program<HelloWorld>;
  const connection = anchor.getProvider().connection;
  let wallet1: anchor.web3.Keypair;
  let wallet2: anchor.web3.Keypair;

  before(async () => {
    wallet1 = await createWallet(connection, 1);
    wallet2 = await createWallet(connection, 1);

    await initializeAccount(program, wallet1);
    await initializeAccount(program, wallet2);
  });

  it("Accounts are initialized correctly.", async () => {
    
    const accountWallet1Data = await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey);
    expect(accountWallet1Data.length).to.be.eq(1);
    expect(accountWallet1Data[0].account.data.eq(new anchor.BN(0))).to.be.true;

    const accountWallet2Data = await getAllAccountsByAuthority(program.account.myAccount, wallet2.publicKey);
    expect(accountWallet2Data.length).to.be.eq(1);
    expect(accountWallet2Data[0].account.data.eq(new anchor.BN(0))).to.be.true;
  });

  it("Increase function works correctly.", async () => {

    const accountBefore = (await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey))[0];

    await program.methods.increase()
      .accounts({myAccount: accountBefore.publicKey, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc();
    
    const accountAfter = (await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey))[0];

    expect(accountAfter.account.data.eq(accountBefore.account.data.add(new anchor.BN(1)))).to.be.true;
  });

  it("Set function works correctly.", async () => {

    const accountBefore = (await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey))[0];
    const setValue = new anchor.BN(5);

    await program.methods.set(setValue)
      .accounts({myAccount: accountBefore.publicKey, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc();
    
    const accountAfter = (await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey))[0];

    expect(accountAfter.account.data.eq(new anchor.BN(5))).to.be.true;
  });


  it("Decrease function works correctly.", async () => {

      const accountBefore = (await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey))[0];
      const setValue = new anchor.BN(5);

      await program.methods.set(setValue)
        .accounts({myAccount: accountBefore.publicKey, authority: wallet1.publicKey})
        .signers([wallet1])
        .rpc();

      await program.methods.decrease()
        .accounts({myAccount: accountBefore.publicKey, authority: wallet1.publicKey})
        .signers([wallet1])
        .rpc();

      const accountAfter = (await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey))[0];

      expect(accountAfter.account.data.eq(setValue.sub(new anchor.BN(1)))).to.be.true;
  });

  it("Cannot decrease below 0.", async () => {

    const account = (await getAllAccountsByAuthority(program.account.myAccount, wallet1.publicKey))[0];

    await program.methods.set(new anchor.BN(0))
      .accounts({myAccount: account.publicKey, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc();

    await expect(program.methods.decrease()
      .accounts({myAccount: account.publicKey, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc()
    ).to.be.rejected;
  });

  it("Cannot modify accounts of other authorities.", async () => {

    const account = (await getAllAccountsByAuthority(program.account.myAccount, wallet2.publicKey))[0];

    await expect(program.methods.set(1)
      .accounts({myAccount: account.publicKey, authority: wallet2.publicKey})
      .signers([wallet1])
      .rpc()
    ).to.be.rejected;
  });
});
