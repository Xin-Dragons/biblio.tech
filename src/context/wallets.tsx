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
  addWallet: Function
  deleteWallet: Function
  updateWallet: Function
}

const initial = {
  wallets: [],
  setIsLedger: noop,
  isLedger: false,
  addWallet: noop,
  deleteWallet: noop,
  updateWallet: noop,
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

  async function addWallet(publicKey: string, nickname?: string, owned?: boolean) {
    await db.wallets.add({
      publicKey,
      nickname,
      owned,
    })
  }

  async function deleteWallet(publicKey: string) {
    await db.wallets.delete(publicKey)
  }

  async function updateWallet(publicKey: string, nickname: string, owned: boolean) {
    await db.wallets.update(publicKey, { nickname, owned })
  }

  return (
    <WalletsContext.Provider
      value={{
        wallets,
        setIsLedger,
        isLedger,
        addWallet,
        deleteWallet,
        updateWallet,
      }}
    >
      {children}
    </WalletsContext.Provider>
  )
}

export const useWallets = () => {
  return useContext(WalletsContext)
}
