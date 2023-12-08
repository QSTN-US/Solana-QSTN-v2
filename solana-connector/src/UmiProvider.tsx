import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { useWallet } from '@solana/wallet-adapter-react';
import type { ReactNode } from 'react';

import { UmiContext } from './useUmi';

export const UmiProvider = ({
  endpoint,
  children
}: {
  endpoint: string;
  children: ReactNode;
}) => {
  const wallet = useWallet();
  const umi = createUmi(endpoint)
    .use(mplCandyMachine())
    .use(walletAdapterIdentity(wallet));
  return <UmiContext.Provider value={{ umi }}>{children}</UmiContext.Provider>;
};
