"use client"
import { fetchDigitalAssetByCollection } from "@/helpers/digital-assets"
import { getSingleMint } from "@/helpers/hello-moon-server-actions"
import { isPublicKey } from "@metaplex-foundation/umi"
import axios from "axios"
import { useParams } from "next/navigation"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useDigitalAssets } from "./digital-assets"

const Context = createContext<{ howRare: RarityItem[] } | undefined>(undefined)

type RarityItem = {
  mint: string
  rank: number
  tier: string
}

export function RarityProvider({ children }: { children: ReactNode }) {
  const params = useParams()
  const [howRare, setHowRare] = useState<RarityItem[]>([])

  async function getHowRare() {
    try {
      const collectionId = params.collectionId as string
      if (!collectionId) {
        return
      }
      let mint: string | undefined = undefined
      if (isPublicKey(collectionId)) {
        const randoMint = await fetchDigitalAssetByCollection(collectionId)
        mint = randoMint.id
      } else {
        mint = await getSingleMint(collectionId)
      }

      if (mint) {
        const { data } = await axios.post("/api/get-howrare", { mint })

        setHowRare(data)
      }
    } catch {
      setHowRare([])
    }
  }

  useEffect(() => {
    getHowRare()
  }, [params.collectionId])

  return <Context.Provider value={{ howRare }}>{children}</Context.Provider>
}

export const useRarity = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useRarity must be used in a RarityProvider")
  }

  return context
}
