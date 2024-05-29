import { createSignerFromKeypair, Keypair, signerIdentity, type Umi } from "@metaplex-foundation/umi"
import { createContext, useContext, useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { ReactNode } from "react"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox"
import { mplTokenAuthRules } from "@metaplex-foundation/mpl-token-auth-rules"
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api"
import { useCluster } from "./cluster"

type UmiContext = {
  umi: Umi | null
  setSigner: Function
}

export const UmiContext = createContext<UmiContext | undefined>(undefined)

export const UmiProvider = ({ children }: { children: ReactNode }) => {
  const { rpcHost } = useCluster()
  const wallet = useWallet()

  const [umi, setUmi] = useState(
    createUmi(rpcHost, { commitment: "processed" })
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata())
      .use(mplToolbox())
      .use(irysUploader())
      .use(mplTokenAuthRules())
      .use(dasApi())
  )

  useEffect(() => {
    if (wallet.publicKey) {
      setUmi(umi.use(walletAdapterIdentity(wallet)))
    }
  }, [wallet.publicKey])

  function setSigner(keypair: Keypair) {
    setUmi(umi.use(signerIdentity(createSignerFromKeypair(umi, keypair))))
  }

  return <UmiContext.Provider value={{ umi, setSigner }}>{children}</UmiContext.Provider>
}

export function useUmi(): Umi {
  const umi = useContext(UmiContext)

  if (!umi) {
    throw new Error("Umi context was not initialized. " + "Did you forget to wrap your app with <UmiProvider />?")
  }

  return umi.umi as Umi
}

export function useUmiSetSigner() {
  const umi = useContext(UmiContext)

  if (!umi) {
    throw new Error("Umi context was not initialized. " + "Did you forget to wrap your app with <UmiProvider />?")
  }

  return umi.setSigner
}
