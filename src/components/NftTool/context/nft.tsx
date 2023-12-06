import { useWallet } from "@solana/wallet-adapter-react"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import {
  DigitalAsset,
  DigitalAssetWithToken,
  JsonMetadata,
  fetchAllDigitalAssetByOwner,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata"
import { useUmi } from "./umi"
import { isSome, unwrapOption } from "@metaplex-foundation/umi"
import { toast } from "react-hot-toast"

const PROJECT_START = Date.parse("2023-01-04")
const NOW = Date.now()

const MS_PER_MONTH = 2.628e9
const MS_PER_WEEK = 6.048e8

const NftsContext = createContext<{
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

export type DigitalAssetWithJson = DigitalAsset & {
  json: JsonMetadata
}

export type DigitalAssetWithJsonAndToken = DigitalAssetWithToken & {
  json: JsonMetadata
}

export const NftsProvider = ({ children }: { children: ReactNode }) => {
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
        return collection.verified && collection.key === process.env.NEXT_PUBLIC_COLLECTION_ID
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

  return (
    <NftsContext.Provider value={{ loading, dandies, collections, createdNfts, refresh }}>
      {children}
    </NftsContext.Provider>
  )
}

export function useNfts() {
  return useContext(NftsContext)
}
