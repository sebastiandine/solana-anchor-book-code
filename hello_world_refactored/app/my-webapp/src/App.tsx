import { createDefaultAuthorizationResultCache, SolanaMobileWalletAdapter } from '@solana-mobile/wallet-adapter-mobile';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
    GlowWalletAdapter,
    PhantomWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import React, { FC, ReactNode, useEffect, useMemo } from 'react';

import * as anchor from '@project-serum/anchor';
import { HelloWorld } from "./types/hello_world";
import idl from "./idl/hello_world.json";

import {useAnchorWallet, useConnection} from "@solana/wallet-adapter-react";
import { useState } from 'react';
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes';

require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');


const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
    // Only the wallets you configure here will be compiled into your application, and only the dependencies
    // of wallets that your users connect to will be loaded.
    const wallets = useMemo(
        () => [
            new SolanaMobileWalletAdapter({
                appIdentity: { name: 'Solana Create React App Starter App' },
                authorizationResultCache: createDefaultAuthorizationResultCache(),
                cluster: network
            }),
            new PhantomWalletAdapter(),
            new GlowWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TorusWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content: FC = () => {

    const wallet = useAnchorWallet();
    const connection = useConnection();

    const [program, setProgram] = useState<anchor.Program<HelloWorld>>(null!);
    const [account, setAccount] = useState<{publicKey: anchor.web3.PublicKey, dataset: any}>(null!);
    const [setValue, setSetValue] = useState<number>(0);

    const findPDAforAuthority = async (_program?: anchor.Program<HelloWorld>): Promise<anchor.web3.PublicKey> => {

        const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
          [utf8.encode('account'), wallet!.publicKey.toBytes()],
          (typeof(_program) !== 'undefined' ? _program.programId : program.programId) // tbd explain this in documentation
        );
        return pda;
    }
        
    const fetchAccount = async (_program?: anchor.Program<HelloWorld>) => { 
        if(typeof(_program) !== 'undefined'){
            const pda = await findPDAforAuthority(_program);
            return await _program.account.myAccount.fetch(pda);
        }
        else{
            const pda = await findPDAforAuthority();
            return await program.account.myAccount.fetch(pda);
        }
    }

    const initAccount = async () => {
        const pda = await findPDAforAuthority();
        await program.methods.initialize()
        .accounts({myAccount: pda,
          authority: wallet!.publicKey, 
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([]) 
        .rpc();
        setAccount({publicKey: pda, dataset: await program.account.myAccount.fetch(pda)});
    };

    const increaseAccountCounter = async () => {
        await program.methods.increase()
        .accounts({myAccount: account!.publicKey, authority: wallet!.publicKey})
        .rpc();

        setAccount({publicKey: account.publicKey, dataset: await fetchAccount()});
    } 

    const decreaseAccountCounter = async () => {
        await program.methods.decrease()
        .accounts({myAccount: account!.publicKey, authority: wallet!.publicKey})
        .rpc();

        setAccount({publicKey: account.publicKey, dataset: await fetchAccount()});
    } 

    const setAccountCounter = async () => {
        await program.methods.set(new anchor.BN(setValue))
        .accounts({myAccount: account!.publicKey, authority: wallet!.publicKey})
        .rpc();

        setAccount({publicKey: account.publicKey, dataset: await fetchAccount()});
    }

    useEffect(() => {
        if(wallet && connection){

            const anchorConnection = new anchor.web3.Connection(
                connection.connection.rpcEndpoint,
                connection.connection.commitment
            );

            const anchorProvider = new anchor.Provider(
                anchorConnection,
                wallet,
                {"preflightCommitment" : connection.connection.commitment}
            );

            const _program = new anchor.Program<HelloWorld>(
                JSON.parse(JSON.stringify(idl)), 
                "6mi3PrgougeFGizsQmkfga5Z6MnRNa5sbnP8yH7261hN",
                anchorProvider
            );

            setProgram(_program);

            /*** search for existing account */
            fetchAccount(_program)
            .then((result) => {
                if(result){
                    findPDAforAuthority(_program)
                    .then((pda) => {
                        setAccount({publicKey: pda, dataset: result});
                    })
                }
            })
            .catch((reason) => console.log(reason));
        }
    }, [wallet, connection]);

    return (
        <div className="App" style={{color:'white', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            {wallet && connection 
                ?   <div style={{margin: '20px'}}>
                        <div>{account 
                            ? `Counter: ${account.dataset.data.toString()}` 
                            : <button onClick={initAccount}>Initialize</button>}
                        </div>
                        {account
                        ? <div><button onClick={increaseAccountCounter}>Increase</button></div>  
                        : ""}
                        {account && account.dataset.data.gt(new anchor.BN(0))
                        ? <div><button onClick={decreaseAccountCounter}>Decrease</button></div>  
                        : ""}
                        {account
                        ? <div>
                            <button onClick={setAccountCounter}>Set</button>
                            <input type="number" min={0} value={setValue} onChange={(evt) => setSetValue(Number(evt.target.value))}></input>
                          </div>
                        : ""}
 
                    </div>
                :   ""
            }
            <WalletMultiButton />
        </div>
    );
};
