# other notes

* Init React App with Typescript template in hello_world/app
    ```
    yarn create react-app . --template typescript
    ```
    takes some time until initial setup

* Explain basic structure and tsx files

* explain final building and production: `yarn build`
* start initial version (start the development sever)
    ```
    yarn start
    ```
    localhost:3000




# start from tarball
download react-app-start as tarball
```
$ npm pack @solana/wallet-adapter-create-react-app-starter
$ ls

solana-wallet-adapter-create-react-app-starter-0.1.2.tgz
```

unpack and rename
```
$ tar zxvf solana-wallet-adapter-create-react-app-starter-0.1.2.tgz 
$ ls

package/

$ mv package my-project
$ ls

my-project
```

install dependencies
```
cd my-project
yarn install
```

start initial version
```
yarn start
```

Fix the following error in case it appears
```
ERROR in src/App.tsx:39:43
TS2345: Argument of type '{ appIdentity: { name: string; }; authorizationResultCache: AuthorizationResultCache; }' is not assignable to parameter of type '{ appIdentity: Readonly<{ uri?: string | undefined; icon?: string | undefined; name?: string | undefined; }>; authorizationResultCache: AuthorizationResultCache; cluster: Cluster; }'.
  Property 'cluster' is missing in type '{ appIdentity: { name: string; }; authorizationResultCache: AuthorizationResultCache; }' but required in type '{ appIdentity: Readonly<{ uri?: string | undefined; icon?: string | undefined; name?: string | undefined; }>; authorizationResultCache: AuthorizationResultCache; cluster: Cluster; }'.
    37 |     const wallets = useMemo(
    38 |         () => [
  > 39 |             new SolanaMobileWalletAdapter({
       |                                           ^
  > 40 |                 appIdentity: { name: 'Solana Create React App Starter App' },
       | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 41 |                 authorizationResultCache: createDefaultAuthorizationResultCache()
       | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 42 |             }),
       | ^^^^^^^^^^^^^^
    43 |             new PhantomWalletAdapter(),
    44 |             new GlowWalletAdapter(),
    45 |             new SlopeWalletAdapter(),
```

in file `src/App.tsx` on line 39, add the the following to the object that is passed to `SolanaMobileWalletAdapter`: `cluster: network`.

## development
### assets
create dir `src/types` and copy our types from `target/types/hello_world.ts` into this directory.
create dir `src/idl` and copy our idl from `target/idl/hello_world.json` into this directory.

### tbd
add Anchor dependency
```
yarn add @project-serum/anchor
```

imports
```
import * as anchor from '@project-serum/anchor';
```
```
import { HelloWorld } from "./types/hello_world";
import idl from "./idl/hello_world.json";

```
```
# import hooks, extend imports from react
# from this:
# import React, { FC, ReactNode, useMemo } from 'react';
# to this
import React, { FC, ReactNode, useMemo, useEffect, useState } from 'react';
```
tbd: explain react hooks briefly

