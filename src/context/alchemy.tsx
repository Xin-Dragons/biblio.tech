import { Alchemy, Network } from "alchemy-sdk"
import { FC, ReactNode, createContext, useContext } from "react"

const config = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
}

const alchemy = new Alchemy(config)

export const AlchemyContext = createContext(alchemy)

export const AlchemyProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return <AlchemyContext.Provider value={alchemy}>{children}</AlchemyContext.Provider>
}

export const useAlchemy = () => {
  return useContext(AlchemyContext)
}
