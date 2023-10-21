"use client"
import { useWallet } from "@solana/wallet-adapter-react"
import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react"
import { getAllDigitalAssetsByOwner, getDandiesForWallets } from "@/helpers/digital-assets"
import { DAS } from "helius-sdk"
import { flatten, uniq } from "lodash"
import { AccessLevel } from "@/constants"
import { getProfile } from "@/app/helpers/supabase"

const Context = createContext<{ accessLevel: AccessLevel; loading: boolean } | undefined>(undefined)

export function AccessProvider({ children }: PropsWithChildren) {
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(AccessLevel.BASIC)

  useEffect(() => {
    if (loading || !wallet.publicKey) {
      return
    }

    ;(async () => {
      try {
        setLoading(true)
        const profile = await getProfile(wallet.publicKey!.toBase58())
        const wallets = profile
          ? (uniq([
              ...(profile.wallets || []).filter((w: any) => w.chain === "solana").map((w) => w.public_key),
              wallet.publicKey?.toBase58(),
            ]).filter(Boolean) as string[])
          : [wallet.publicKey!.toBase58()]
        const dandies = await getDandiesForWallets(wallets)

        console.log("Dandies length", dandies.length)

        if (dandies.length >= 10) {
          setAccessLevel(AccessLevel.UNLIMITED)
        } else if (dandies.length >= 5) {
          setAccessLevel(AccessLevel.PRO)
        } else if (dandies.length >= 1) {
          setAccessLevel(AccessLevel.ADVANCED)
        } else {
          setAccessLevel(AccessLevel.BASIC)
        }
      } catch (err) {
        console.log("FUCKS SAKE", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [wallet.publicKey])

  return <Context.Provider value={{ accessLevel, loading }}>{children}</Context.Provider>
}

export const useAccess = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useAccess must be used in an AccessProvider")
  }

  return context
}
