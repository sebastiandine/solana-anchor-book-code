import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MetaplexScripts } from "../target/types/metaplex_scripts";

describe("metaplex_scripts", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.MetaplexScripts as Program<MetaplexScripts>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
