import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox"
import { Umi } from "@metaplex-foundation/umi"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { bundlrUploader } from "@metaplex-foundation/umi-uploader-bundlr"
import { useWallet } from "@solana/wallet-adapter-react"
import { ReactNode, createContext, useContext } from "react"

const Context = createContext<Umi | undefined>(undefined)

export function UmiProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet()
  const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })
    .use(mplTokenMetadata())
    .use(mplToolbox())
    .use(bundlrUploader())
    .use(walletAdapterIdentity(wallet))

  return <Context.Provider value={umi}>{children}</Context.Provider>
}

export const useUmi = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useUmi must be used in a UmiProvider")
  }

  return context
}
