import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { expect } from 'chai';
import { Puppet } from '../target/types/puppet';
import { PuppetMaster } from '../target/types/puppet_master';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";

const findPDAforAuthority = async (programId: anchor.web3.PublicKey, authority: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> => {

  const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
    [utf8.encode('puppet'), authority.toBytes()],
    programId
  );
  return pda;
}

describe('puppet-master', () => {
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const puppetProgram = anchor.workspace.Puppet as Program<Puppet>;
  const puppetMasterProgram = anchor.workspace.PuppetMaster as Program<PuppetMaster>;

  before(async () => {

    const puppetPDA = await findPDAforAuthority(puppetProgram.programId, provider.wallet.publicKey);

    await puppetProgram.methods
      .initialize()
      .accounts({
          puppetAccount: puppetPDA,
          authority: provider.wallet.publicKey,
      })
      .rpc();
  });

  it('CPI is working.', async () => {

    const puppetPDA = await findPDAforAuthority(puppetProgram.programId, provider.wallet.publicKey);

    await puppetMasterProgram.methods
        .pullStrings(new anchor.BN(42))
        .accounts({
            puppetProgram: puppetProgram.programId,
            puppetAccount: puppetPDA
        })
        .rpc();

    expect((await puppetProgram.account.data
      .fetch(puppetPDA)).data.toNumber()).to.equal(42);
  });
});