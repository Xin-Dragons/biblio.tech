import { noop } from "lodash"
import { FC, ReactNode, createContext, useContext, useState } from "react"

export const WalletBypassContext = createContext({ bypassWallet: false, setBypassWallet: noop })

type WalletBypassProviderProps = {
  children: ReactNode
}

export const WalletBypassProvider: FC<WalletBypassProviderProps> = ({ children }) => {
  const [bypassWallet, setBypassWallet] = useState(false)

  return (
    <WalletBypassContext.Provider value={{ bypassWallet, setBypassWallet }}>{children}</WalletBypassContext.Provider>
  )
}

export const useWalletBypass = () => {
  return useContext(WalletBypassContext)
}
