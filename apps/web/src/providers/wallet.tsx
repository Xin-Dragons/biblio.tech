import { FC, ReactNode } from "react"
import { AppProvider, getDefaultConfig } from "@solana/connector/react"

interface WalletProviderProps {
  children: ReactNode
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const rpcProxyUrl = `${window.location.origin}/api/rpc`

  const config = getDefaultConfig({
    appName: "Biblio",
    clusters: [
      {
        id: "solana:mainnet",
        label: "Mainnet",
        url: rpcProxyUrl,
      },
    ],
    autoConnect: true,
  })

  return <AppProvider connectorConfig={config}>{children}</AppProvider>
}
