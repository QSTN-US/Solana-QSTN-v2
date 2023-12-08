import '@solana/wallet-adapter-react-ui/styles.css';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import type { ReactNode } from 'react';
import { createContext, useMemo, useState } from 'react';

export interface SolanaNetworkDetailsType {
  network: string;
  networkUrl: string;
}

export interface SolanaWalletContextType {
  solanaAddress?: string;
  networkDetails?: SolanaNetworkDetailsType;
  endPoint?: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface SolanaWalletProviderProps {
  children: ReactNode;
}

export const SolanaWalletContext = createContext<
  SolanaWalletContextType | undefined
>(undefined);

export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  const [walletContext, setWalletContext] = useState<any>({
    connect: async () => {},
    disconnect: async () => {}
  });

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      new LedgerWalletAdapter(),
      new SlopeWalletAdapter(),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new SolletWalletAdapter({ network }),
      new SolletExtensionWalletAdapter({ network })
    ],
    [network]
  );

  const disconnect = async () => {
    const walletAddress = '';
    if (!walletAddress) {
      return;
    }
    setWalletContext(null);
  };

  const connect = async () => {
    const walletAddress = '';

    if (!walletAddress) {
      return;
    }

    setWalletContext({
      solanaAddress: walletAddress,
      endPoint: endpoint,
      network: network,
      connect,
      disconnect
    });
  };

  return (
    <SolanaWalletContext.Provider
      value={{
        solanaAddress: walletContext?.address ? walletContext?.address : '',
        network: walletContext?.network,
        endPoint: walletContext?.endPoint,
        connect,
        disconnect
      }}
    >
      {children}
    </SolanaWalletContext.Provider>
  );
}
