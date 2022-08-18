import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { HelloWorld } from "../target/types/hello_world";

import chai from "chai";
import { expect } from "chai";

import chaiAsPromised from "chai-as-promised";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
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

const findPDAforAuthority = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('account'), authority.toBytes()],
    programId
  );

  return pda;
}

const initializeAccount = async (program: Program<HelloWorld>, authority: anchor.web3.Keypair): Promise<anchor.web3.PublicKey> => {

  const pda = await findPDAforAuthority(program.programId, authority.publicKey);

  await program.methods.initialize()
    .accounts({myAccount: pda,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([authority])
    .rpc();
  
    return pda;
}

const fetchAccount = async (program: Program<HelloWorld>, authority: anchor.web3.PublicKey) => { 
  return await program.account.myAccount.fetch(await findPDAforAuthority(program.programId, authority));
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
    
    const accountWallet1Data = await fetchAccount(program, wallet1.publicKey);
    expect(accountWallet1Data.data.eq(new anchor.BN(0))).to.be.true;

    const accountWallet2Data = await fetchAccount(program, wallet2.publicKey);
    expect(accountWallet2Data.data.eq(new anchor.BN(0))).to.be.true;
  });

  it("Increase function works correctly.", async () => {

    const pda = await findPDAforAuthority(program.programId, wallet1.publicKey);
    const accountBefore = await fetchAccount(program, wallet1.publicKey);

    await program.methods.increase()
      .accounts({myAccount: pda, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc();
    
    const accountAfter = await fetchAccount(program, wallet1.publicKey);

    expect(accountAfter.data.eq(accountBefore.data.add(new anchor.BN(1)))).to.be.true;
  });

  it("Set function works correctly.", async () => {

    const pda = await findPDAforAuthority(program.programId, wallet1.publicKey);
    const setValue = new anchor.BN(5);

    await program.methods.set(setValue)
      .accounts({myAccount: pda, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc();
    
    const accountAfter = await fetchAccount(program, wallet1.publicKey);

    expect(accountAfter.data.eq(new anchor.BN(5))).to.be.true;
  });


  it("Decrease function works correctly.", async () => {

      const pda = await findPDAforAuthority(program.programId, wallet1.publicKey);
      const setValue = new anchor.BN(5);

      await program.methods.set(setValue)
        .accounts({myAccount: pda, authority: wallet1.publicKey})
        .signers([wallet1])
        .rpc();

      await program.methods.decrease()
        .accounts({myAccount: pda, authority: wallet1.publicKey})
        .signers([wallet1])
        .rpc();

      const accountAfter = await fetchAccount(program, wallet1.publicKey);

      expect(accountAfter.data.eq(setValue.sub(new anchor.BN(1)))).to.be.true;
  });

  it("Cannot decrease below 0.", async () => {

    const pda = await findPDAforAuthority(program.programId, wallet1.publicKey);

    await program.methods.set(new anchor.BN(0))
      .accounts({myAccount: pda, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc();

    await expect(program.methods.decrease()
      .accounts({myAccount: pda, authority: wallet1.publicKey})
      .signers([wallet1])
      .rpc()
    ).to.be.rejected;
  });

  it("Cannot modify accounts of other authorities.", async () => {

    const pda = await findPDAforAuthority(program.programId, wallet1.publicKey);

    await expect(program.methods.set(1)
      .accounts({myAccount: pda, authority: wallet2.publicKey})
      .signers([wallet1])
      .rpc()
    ).to.be.rejected;
  });

  it("Authority cannot create a second account.", async () => {

    const pda = await findPDAforAuthority(program.programId, wallet1.publicKey);

    await expect(program.methods.initialize()
    .accounts({myAccount: pda,
      authority: wallet1.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([wallet1])
    .rpc())
    .to.be.rejected;
  });
});
