import { createContext, FC, useContext, useEffect, useState } from 'react';
import { Connection } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { useWallet } from '@solana/wallet-adapter-react';

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST as string);
const mp = Metaplex.make(connection);

const MetaplexContext = createContext(mp);

type MetaplexContextProps = {
  children: JSX.Element | JSX.Element[];
};

export const MetaplexProvider: FC<MetaplexContextProps> = ({ children }) => {
  const [metaplex, setMetaplex] = useState(mp);
  const wallet = useWallet();

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const mp = metaplex.use(walletAdapterIdentity(wallet));
      setMetaplex(mp);
    }
  }, [wallet.connected, wallet.publicKey]);

  return <MetaplexContext.Provider value={metaplex}>{children}</MetaplexContext.Provider>;
};

export function useMetaplex() {
  return useContext(MetaplexContext);
}
