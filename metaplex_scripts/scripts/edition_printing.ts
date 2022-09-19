import * as anchor from "@project-serum/anchor";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";

const printEdition = async () => {

  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const metaplex = new Metaplex(provider.connection).use(walletAdapterIdentity(provider.wallet));


  const nft = await metaplex.nfts().create({
    name: `Shape #1`,
    symbol: "SHPS",
    uri: "https://raw.githubusercontent.com/sebastiandine/temp-testing/main/nft-collection/nft1.json",
    sellerFeeBasisPoints: 0,
    maxSupply: new anchor.BN(100)

  }).run();

  metaplex.nfts().printNewEdition({
    originalMint: nft.mintAddress
  }).run();

}

printEdition().then(
  (result) => {console.log("success")},
  (reason) => {console.log("failed", reason)}
);