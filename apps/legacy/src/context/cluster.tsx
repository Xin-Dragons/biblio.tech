import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useState } from "react"

export enum Cluster {
  MAINNET = "mainnet",
  DEVNET = "devnet",
}

const Context = createContext<
  { cluster: Cluster; setCluster: Dispatch<SetStateAction<Cluster>>; rpcHost: string } | undefined
>(undefined)

const clusters = {
  devnet: process.env.NEXT_PUBLIC_DEVNET_RPC_HOST,
  mainnet: process.env.NEXT_PUBLIC_RPC_HOST,
}

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<Cluster>(Cluster.MAINNET)

  return (
    <Context.Provider value={{ cluster, setCluster, rpcHost: clusters[cluster] || (clusters.mainnet as string) }}>
      {children}
    </Context.Provider>
  )
}

export const useCluster = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useCluster must be used in a ClusterProvider")
  }

  return context
}
