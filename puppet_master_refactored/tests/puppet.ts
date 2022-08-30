import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { expect } from 'chai';
import { Puppet } from '../target/types/puppet';
import { PuppetMaster } from '../target/types/puppet_master';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";

const findPDAforPuppet = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('puppet'), authority.toBytes()],
    programId
  );
  return pda;
}

const findPDAforMaster = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey) => {

  const [pda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('master'), authority.toBytes()],
    programId
  );
  return {pda: pda, bump: bump};
}

describe('puppet-master', () => {
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const puppetProgram = anchor.workspace.Puppet as Program<Puppet>;
  const puppetMasterProgram = anchor.workspace.PuppetMaster as Program<PuppetMaster>;
  
  before(async () => {

    const masterPDA = await findPDAforMaster(puppetMasterProgram.programId, provider.wallet.publicKey);
    const puppetPDA = await findPDAforPuppet(puppetProgram.programId, masterPDA.pda);

    // create "puppet master pda account" with authority "provider.wallet"
    await puppetMasterProgram.methods
      .initialize()
      .accounts({
          masterPdaAccount: masterPDA.pda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();

    // create "puppet pda account" with authority "puppet master pda account"
    await puppetProgram.methods
      .initialize()
      .accounts({
        puppetAccount: puppetPDA,
        authority: masterPDA.pda,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId

      })
      .rpc();
  });

  it('PDA-signed CPI is working.', async () => {

    const masterPDA = await findPDAforMaster(puppetMasterProgram.programId, provider.wallet.publicKey);
    const puppetPDA = await findPDAforPuppet(puppetProgram.programId, masterPDA.pda);

    await puppetMasterProgram.methods
        .pullStrings(masterPDA.bump, new anchor.BN(42))
        .accounts({
            puppetProgram: puppetProgram.programId,
            puppetAccount: puppetPDA,
            masterPdaAccount: masterPDA.pda,
            authority: provider.wallet.publicKey,

        })
        .rpc();

    expect((await puppetProgram.account.data
      .fetch(puppetPDA)).data.toNumber()).to.equal(42);
  });

  it('Keypair as authority is working.', async () => {

    const puppetPDA = await findPDAforPuppet(puppetProgram.programId, provider.wallet.publicKey);

    // create "puppet pda account" with authority "provider.wallet"
    await puppetProgram.methods
      .initialize()
      .accounts({
        puppetAccount: puppetPDA,
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();
    
    await puppetProgram.methods
      .setData(new anchor.BN(100))
      .accounts({
        puppetAccount: puppetPDA,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    expect((await puppetProgram.account.data
      .fetch(puppetPDA)).data.toNumber()).to.equal(100);
  });
});
