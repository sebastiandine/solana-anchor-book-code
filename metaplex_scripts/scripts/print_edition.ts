import * as anchor from "@project-serum/anchor";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";

const printEdition = async () => {

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const metaplex = new Metaplex(provider.connection).use(walletAdapterIdentity(provider.wallet));


  const nft = await metaplex.nfts().create({
    name: "Happy Star",
    symbol: "STR",
    uri: "https://raw.githubusercontent.com/sebastiandine/temp-testing/main/star.json",
    sellerFeeBasisPoints: 500,
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