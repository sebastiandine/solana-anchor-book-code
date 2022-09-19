import * as anchor from "@project-serum/anchor";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";

import { createCreateMetadataAccountV2Instruction, CreateMetadataAccountArgsV2, CreateMetadataAccountV2InstructionAccounts, CreateMetadataAccountV2InstructionArgs, DataV2, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

const createFungibleTokenMetadata = async () => {

  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const mint = new anchor.web3.PublicKey("7bNJ3vodbfZebf58xrhkuPYC3tms7DaU1cTKEjW8D7kr");

  const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('metadata'), PROGRAM_ID.toBytes(), mint.toBytes()],
    PROGRAM_ID
  );

  const accounts: CreateMetadataAccountV2InstructionAccounts = {
    metadata: pda,
    mint: mint,
    mintAuthority: provider.wallet.publicKey,
    payer: provider.wallet.publicKey,
    updateAuthority: provider.wallet.publicKey
  }

  const data: DataV2 = {
    name: "MyTest Token",
    symbol: "TEST",
    uri: "https://raw.githubusercontent.com/sebastiandine/solana-anchor-book-code/master/metaplex_scripts/scripts/assets/fungible-token/metadata.json",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,     
    uses: null 
  }

  const metadataArgs: CreateMetadataAccountArgsV2 = {
    data: data,
    isMutable: true
  }
  const args: CreateMetadataAccountV2InstructionArgs = {
    createMetadataAccountArgsV2: metadataArgs
  }

  const ix: anchor.web3.TransactionInstruction = createCreateMetadataAccountV2Instruction(
    accounts, args);
  const transaction = new anchor.web3.Transaction().add(ix);

  return provider.send(transaction);
}


createFungibleTokenMetadata().then(
  (result) => {console.log("success")},
  (reason) => {console.log("failed", reason)}
);