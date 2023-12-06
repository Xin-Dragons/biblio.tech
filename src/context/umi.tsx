import type { Umi } from "@metaplex-foundation/umi"
import { createContext, useContext } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { ReactNode } from "react"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox"
import { mplTokenAuthRules } from "@metaplex-foundation/mpl-token-auth-rules"

type UmiContext = {
  umi: Umi | null
}

const DEFAULT_CONTEXT: UmiContext = {
  umi: null,
}

export const UmiContext = createContext<UmiContext>(DEFAULT_CONTEXT)

export const UmiProvider = ({ children, endpoint }: { children: ReactNode; endpoint: string }) => {
  const wallet = useWallet()
  const umi = createUmi(endpoint, { commitment: "processed" })
    .use(walletAdapterIdentity(wallet))
    .use(mplTokenMetadata())
    .use(mplToolbox())
    .use(irysUploader())
    .use(mplTokenAuthRules())

  return <UmiContext.Provider value={{ umi }}>{children}</UmiContext.Provider>
}

export function useUmi(): Umi {
  const umi = useContext(UmiContext).umi
  if (!umi) {
    throw new Error("Umi context was not initialized. " + "Did you forget to wrap your app with <UmiProvider />?")
  }
  return umi
}
