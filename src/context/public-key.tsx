import { useWallet } from "@solana/wallet-adapter-react"
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react"
import { useWalletBypass } from "./wallet-bypass"

const Context = createContext<string | undefined>(undefined)

export function PublicKeyProvider({ children }: PropsWithChildren) {
  const wallet = useWallet()
  const [publicKey, setPublicKey] = useState(wallet.publicKey?.toBase58() || "")
  const { bypassWallet } = useWalletBypass()

  useEffect(() => {
    if (bypassWallet) {
      return
    }

    setPublicKey(wallet.publicKey?.toBase58() || "")
  }, [wallet.publicKey, bypassWallet])

  return <Context.Provider value={publicKey}>{children}</Context.Provider>
}

export const usePublicKey = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("usePublicKey must be used in a PublicKeyProvider")
  }

  return context
}
