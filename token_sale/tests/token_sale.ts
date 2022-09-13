import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {  createMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createSetAuthorityInstruction, AuthorityType, getAccount} from "@solana/spl-token";

import { TokenSale } from "../target/types/token_sale";

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

describe("token_sale", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenSale as Program<TokenSale>;

  let wallet1: anchor.web3.Keypair;
  let mint: anchor.web3.PublicKey;
  let mintAuthority: {pda: anchor.web3.PublicKey, bump: number};

  before(async () => {
    wallet1 = await createWallet(provider.connection, 10);

    // create mint
    mint = await createMint(provider.connection, wallet1, wallet1.publicKey, null, 9);

    // derive pda from the sale that should be the mint authority
    const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode("MINT_AUTHORITY"), mint.toBytes()],
      program.programId
    );
    mintAuthority = {pda: pda, bump: bump};

    // change mint authority to pda
    const tx = new anchor.web3.Transaction()
      .add(createSetAuthorityInstruction(
        mint,
        wallet1.publicKey,
        AuthorityType.MintTokens,
        mintAuthority.pda
      ));
    await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [wallet1]);
  });

 
  it("Purchase Tokens", async () => {

    const associatedTokenAccount = await getAssociatedTokenAddress(mint, wallet1.publicKey);

    const solBalanceBuyerBefore = await provider.connection.getBalance(wallet1.publicKey);
    const solBalanceSellerBefore = await provider.connection.getBalance(mintAuthority.pda);
    
    await program.methods.purchase(mintAuthority.bump, new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
      .accounts({
        payer: wallet1.publicKey,
        tokenAccount: associatedTokenAccount,
        mint: mint,
        mintAuthority: mintAuthority.pda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        
      })
      .signers([wallet1])
      .rpc();
    
      const solBalanceBuyerAfter = await provider.connection.getBalance(wallet1.publicKey);
      const solBalanceSellerAfter = await provider.connection.getBalance(mintAuthority.pda);
      const tokenAccountBuyerAfter = await getAccount(provider.connection, associatedTokenAccount);

      expect(solBalanceBuyerAfter <= (solBalanceBuyerBefore - anchor.web3.LAMPORTS_PER_SOL)).to.be.true;
      expect(solBalanceSellerAfter == (solBalanceSellerBefore + anchor.web3.LAMPORTS_PER_SOL)).to.be.true;
      expect(tokenAccountBuyerAfter.amount == new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 5)).to.be.true;
  });

  it("Second Purchase does not reinitialize ATA", async () => {

    const associatedTokenAccount = await getAssociatedTokenAddress(mint, wallet1.publicKey);
    const tokenAccountBuyerBefore = await getAccount(provider.connection, associatedTokenAccount);

    await program.methods.purchase(mintAuthority.bump, new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
    .accounts({
      payer: wallet1.publicKey,
      tokenAccount: associatedTokenAccount,
      mint: mint,
      mintAuthority: mintAuthority.pda,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      
    })
    .signers([wallet1])
    .rpc();

    const tokenAccountBuyerAfter = await getAccount(provider.connection, associatedTokenAccount);
    expect(tokenAccountBuyerBefore.amount > new anchor.BN(0)).to.be.true;
    expect(tokenAccountBuyerAfter.amount == (new anchor.BN(tokenAccountBuyerBefore.amount).add(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 5)))).to.be.true;
  });

  it("Purchase cannot exceed SOL balance", async () => {

    const associatedTokenAccount = await getAssociatedTokenAddress(mint, wallet1.publicKey);
    const solBalanceBuyer = await provider.connection.getBalance(wallet1.publicKey);

    await expect(program.methods.purchase(mintAuthority.bump, new anchor.BN(solBalanceBuyer + 1))
      .accounts({
        payer: wallet1.publicKey,
        tokenAccount: associatedTokenAccount,
        mint: mint,
        mintAuthority: mintAuthority.pda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet1])
      .rpc())
    .to.be.rejected;
  });

  it("No other PDA has mint authority", async () => {

    const associatedTokenAccount = await getAssociatedTokenAddress(mint, wallet1.publicKey);
    
    const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [utf8.encode("MINT_AUTHORITY_FAKE"), mint.toBytes()],
      program.programId
    );

    await expect(program.methods.purchase(bump, new anchor.BN(1))
      .accounts({
        payer: wallet1.publicKey,
        tokenAccount: associatedTokenAccount,
        mint: mint,
        mintAuthority: pda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet1])
      .rpc())
    .to.be.rejected;
  });
});
