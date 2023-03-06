import { PublicKey } from "@metaplex-foundation/js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { RpcResponseAndContext } from "@solana/web3.js";
import { createContext, useContext, useEffect, useState } from "react";

const FrozenContext = createContext();

export const FrozenProvider = ({ children }) => {
  const [items, setItems] = useState<any[]>([]);
  const [frozen, setFrozen] = useState<string[]>([]);
  const [inVault, setInVaut] = useState<string[]>([]);
  const { connection } = useConnection();
  const wallet = useWallet();

  async function getFrozen() {
    const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey as PublicKey, { programId: TOKEN_PROGRAM_ID })
    const items = accounts.value.filter(account => account.account.data.parsed.info.state === 'frozen')
    setItems(items)
    setFrozen(items.map(item => item.account.data.parsed.info.mint))
    setInVaut(
      items
        .filter(account => account.account.data.parsed.info.delegate === wallet.publicKey.toBase58())
        .map(item => item.account.data.parsed.info.mint)
    )
  }

  useEffect(() => {
    if (wallet.publicKey) {
      getFrozen()
    }
  }, [wallet.publicKey])

  return (
    <FrozenContext.Provider value={{ frozen, inVault }}>
      { children }
    </FrozenContext.Provider>
  ) 
}

export const useFrozen = () => {
  return useContext(FrozenContext);
}