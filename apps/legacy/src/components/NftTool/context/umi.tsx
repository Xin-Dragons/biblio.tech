import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox"
import { Umi } from "@metaplex-foundation/umi"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { useWallet } from "@solana/wallet-adapter-react"
import { ReactNode, createContext, useContext, useMemo, useState } from "react"
import { useCluster } from "../../../context/cluster"

const Context = createContext<Umi | undefined>(undefined)

export function UmiProvider({ children }: { children: ReactNode }) {
  const { rpcHost } = useCluster()
  const wallet = useWallet()

  const umi = useMemo(
    () =>
      createUmi(rpcHost, { commitment: "processed" })
        .use(mplTokenMetadata())
        .use(mplToolbox())
        .use(irysUploader())
        .use(walletAdapterIdentity(wallet)),
    [rpcHost, wallet.publicKey]
  )

  return <Context.Provider value={umi}>{children}</Context.Provider>
}

export const useUmi = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useUmi must be used in a UmiProvider")
  }

  return context
}
