import { useLiveQuery } from "dexie-react-hooks"
import { FC, ReactNode, createContext, useContext } from "react"
import { useDatabase } from "./database"
import { Wallet } from "../db"
import { useWallet } from "@solana/wallet-adapter-react"
import { noop } from "lodash"

type WalletsContextProps = {
  wallets: Wallet[]
  setIsLedger: Function
  isLedger: boolean
}

const initial = {
  wallets: [],
  setIsLedger: noop,
  isLedger: false,
}

export const WalletsContext = createContext<WalletsContextProps>(initial)

type WalletsProviderProps = {
  children: ReactNode
}

export const WalletsProvider: FC<WalletsProviderProps> = ({ children }) => {
  const { db } = useDatabase()
  const wallets = useLiveQuery(() => db.wallets.toArray(), [], [])
  const wallet = useWallet()

  async function setIsLedger(isLedger: boolean) {
    if (!wallet.publicKey) {
      return
    }
    const base58Wallet = wallet.publicKey.toBase58()
    const exists = await db.wallets.get(base58Wallet)
    if (exists) {
      await db.wallets.update(base58Wallet, { isLedger, owned: true })
    } else {
      await db.wallets.add({ publicKey: base58Wallet, isLedger, owned: true })
    }
  }

  const isLedger = Boolean(
    wallet.publicKey && (wallets.find((w) => w.publicKey === wallet.publicKey?.toBase58()) || {}).isLedger
  )

  return (
    <WalletsContext.Provider
      value={{
        wallets,
        setIsLedger,
        isLedger,
      }}
    >
      {children}
    </WalletsContext.Provider>
  )
}

export const useWallets = () => {
  return useContext(WalletsContext)
}
