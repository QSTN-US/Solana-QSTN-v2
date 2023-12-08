import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { MetaplexContext } from './useMetaplex';

export const MetaplexProvider: FC<{
  endpoint: string;
  children: ReactNode;
}> = ({ endpoint, children }) => {
  const wallet = useWallet();
  const connection = useMemo(() => new Connection(endpoint), [endpoint]);
  const metaplex = useMemo(
    () => Metaplex.make(connection).use(walletAdapterIdentity(wallet)),
    [wallet, connection]
  );
  return (
    <MetaplexContext.Provider value={{ metaplex }}>
      {children}
    </MetaplexContext.Provider>
  );
};
