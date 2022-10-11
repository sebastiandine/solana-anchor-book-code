import * as anchor from "@project-serum/anchor";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";

const createNftCollection = async () => {

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const metaplex = new Metaplex(provider.connection).use(walletAdapterIdentity(provider.wallet));

  // create collection
  const collection = await metaplex.nfts().create({
    name: "Shapes Collection",
    symbol: "SHPS",
    uri: "https://raw.githubusercontent.com/sebastiandine/temp-testing/main/nft-collection/shape-collection.json",
    sellerFeeBasisPoints: 0,
    isCollection: true,
    collectionIsSized: true
  }).run();

  // create nfts
  for (let i = 0; i < 4; i++){
    const nft = await metaplex.nfts().create({
      name: `Shape #${i+1}`,
      symbol: "SHPS",
      uri: `https://raw.githubusercontent.com/sebastiandine/solana-anchor-book-code/master/metaplex_scripts/scripts/assets/nfts/shape${i+1}.json`,
      sellerFeeBasisPoints: 500,
      collection: collection.mintAddress
    }).run();

    await metaplex.nfts().verifyCollection({
      mintAddress: nft.mintAddress,
      collectionMintAddress: collection.mintAddress,
    }).run();
  }
}

createNftCollection().then(
  (result) => {console.log("success")},
  (reason) => {console.log("failed", reason)}
);