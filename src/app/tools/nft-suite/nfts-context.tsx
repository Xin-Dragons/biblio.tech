"use client"
import { useWallet } from "@solana/wallet-adapter-react"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import {
  DigitalAsset,
  JsonMetadata,
  fetchAllDigitalAssetByOwner,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata"
import { isSome, unwrapOption } from "@metaplex-foundation/umi"
import { toast } from "react-hot-toast"
import { useUmi } from "@/context/umi"

const Context = createContext<{
  loading: boolean
  dandies: DigitalAsset[]
  collections: DigitalAssetWithJson[]
  createdNfts: DigitalAssetWithJson[]
  refresh: Function
}>({
  loading: false,
  dandies: [],
  collections: [],
  createdNfts: [],
  refresh: () => {},
})

type DigitalAssetWithJson = DigitalAsset & {
  json: JsonMetadata
}

export function NftsProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet()
  const umi = useUmi()
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<DigitalAssetWithJson[]>([])
  const [dandies, setDandies] = useState<DigitalAsset[]>([])
  const [createdNfts, setCreatedNfts] = useState<DigitalAssetWithJson[]>([])

  async function getNfts() {
    try {
      setLoading(true)
      const digitalAssets = await Promise.all(await fetchAllDigitalAssetByOwner(umi, umi.identity.publicKey))

      const dandies = digitalAssets.filter((nft) => {
        const collection = unwrapOption(nft.metadata.collection)
        if (!collection) {
          return false
        }
        return (
          (collection.verified && collection.key === process.env.NEXT_PUBLIC_COLLECTION_ID) ||
          nft.metadata.updateAuthority === umi.identity.publicKey
        )
      })

      const createdNfts = await Promise.all(
        digitalAssets
          .filter((da) => da.metadata.updateAuthority === umi.identity.publicKey)
          .map(async (da) => {
            const json = await fetchJsonMetadata(umi, da.metadata.uri)
            return {
              ...da,
              json,
            }
          })
      )

      const collections = createdNfts.filter((da) => isSome(da.metadata.collectionDetails))

      setDandies(dandies)
      setCreatedNfts(createdNfts)
      setCollections(collections)
    } catch (e) {
      console.log(e)
      toast.error("Error reading NFTs from wallet")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (wallet.connected) {
      getNfts()
    }
  }, [wallet.publicKey, wallet.connected])

  function refresh() {
    getNfts()
  }

  return <Context.Provider value={{ loading, dandies, collections, createdNfts, refresh }}>{children}</Context.Provider>
}

export function useNfts() {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useNfts must be used in a NftsProvider")
  }

  return context
}
