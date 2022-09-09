import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {  createMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress} from "@solana/spl-token";

import { TokenSale } from "../target/types/token_sale";


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

describe("token_sale", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenSale as Program<TokenSale>;

  let wallet1: anchor.web3.Keypair;
  let mint: anchor.web3.PublicKey;

  before(async () => {
    wallet1 = await createWallet(provider.connection, 10);

    mint = await createMint(provider.connection, wallet1, program.programId, null, 9);
    //console.log(await getMint(provider.connection, mint));
    

  });

 
  it("Is initialized!", async () => {
    const before = await provider.connection.getTokenAccountsByOwner(wallet1.publicKey, {programId: TOKEN_PROGRAM_ID});
    console.log(before);

    const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [wallet1.publicKey.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log(pda.toString());

    const pda2 = await getAssociatedTokenAddress(mint, wallet1.publicKey);
    console.log(pda2.toString());
    

    await program.methods.purchase(bump)
      .accounts({
        payer: wallet1.publicKey,
        tokenAccount: pda2,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        
      })
      .signers([wallet1])
      .rpc();
    
      const after = await provider.connection.getTokenAccountsByOwner(wallet1.publicKey, {programId: TOKEN_PROGRAM_ID});
      console.log(after);

      await program.methods.purchase(bump)
      .accounts({
        payer: wallet1.publicKey,
        tokenAccount: pda2,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        
      })
      .signers([wallet1])
      .rpc();
    
    
  });
});
