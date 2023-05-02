import { WalletContextState, useWallet as useBaseWallet } from "@solana/wallet-adapter-react"
import { WalletProvider as BaseWalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { PublicKey } from "@solana/web3.js";
import { FC, ReactElement, createContext, useContext, useEffect, useState } from "react";

type WalletContextProps = WalletContextStateWithAdmin | null

export const WalletContext = createContext<WalletContextProps>(null);

interface WalletContextStateWithAdmin extends WalletContextState {
  isAdmin?: boolean;
}

type WalletProviderProps = {
  children: ReactElement;
  publicKey?: PublicKey;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children, publicKey }) => {
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
  ]

  return (
    <BaseWalletProvider wallets={wallets} autoConnect>
      <WalletContextProvider publicKey={publicKey}>
        { children }
      </WalletContextProvider>
    </BaseWalletProvider>
  )
}

export const WalletContextProvider: FC<WalletProviderProps> = ({ children, publicKey }) => {
  const baseWallet = useBaseWallet();
  const [wallet, setWallet] = useState<WalletContextStateWithAdmin>(baseWallet);

  useEffect(() => {
    setWallet((prevState: WalletContextStateWithAdmin) => {
      return {
        ...prevState,
        isAdmin: !!baseWallet.publicKey && (!publicKey || baseWallet.publicKey.equals(publicKey))
      }
    })
  }, [baseWallet.publicKey, publicKey])

  return (
    <WalletContext.Provider value={wallet}>
      { children }
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  return useContext(WalletContext)
}