"use client"
import { DB } from "@/db"
import { useLiveQuery } from "dexie-react-hooks"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useFilters } from "./filters"
import { size } from "lodash"
import { useListings } from "./listings"
const db = new DB()

const Context = createContext<
  { digitalAssets: any[]; filtered: any[]; loading: boolean; getDigitalAssets: Function } | undefined
>(undefined)

export function DigitalAssetsProvider({
  wallet,
  children,
  collectionId,
}: {
  wallet?: string
  children: ReactNode
  collectionId?: string
}) {
  const { selectedFilters, search } = useFilters()
  const [loading, setLoading] = useState(false)
  const { listings } = useListings()

  const digitalAssets = useLiveQuery(
    () => {
      const query = collectionId ? db.digitalAssets.where({ collectionId }) : db.digitalAssets
      return query
        .filter((item) => {
          // stupid fix for stupid y00ts.
          return item.content.json_uri !== "https://brref1.site" && (!wallet || item.ownership.owner === wallet)
        })
        .toArray()
    },
    [collectionId, wallet],
    []
  )

  let filtered = digitalAssets.filter((item) => {
    return (
      !size(selectedFilters) ||
      Object.keys(selectedFilters).every((key) => {
        const vals = selectedFilters[key]
        return (
          !vals.length ||
          vals.includes(
            (item.content.metadata.attributes || []).filter(Boolean).find((att) => att.trait_type === key)?.value
          )
        )
      })
    )
  })

  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter((item) => {
      return item.content.metadata.name.toLowerCase().includes(s)
    })
  }

  useEffect(() => {
    const mints = digitalAssets.map((da) => da.id)
    const toLoad = listings.filter((listing) => !mints.includes(listing.nftMint)).map((l) => l.nftMint)
    if (toLoad.length) {
      getDigitalAssets(toLoad)
    }
  }, [listings, digitalAssets])

  async function setDigitalAssets(digitalAssets) {
    await db.digitalAssets.bulkPut(
      digitalAssets.map((da) => ({
        ...da,
        collectionId,
      }))
    )
  }

  function getDigitalAssets(ids?: string[]) {
    if (!collectionId && !wallet && !ids) {
      return
    }
    const worker = new Worker(new URL("@/../public/get-digital-assets.worker.ts", import.meta.url))

    worker.onmessage = (event) => {
      // y00ts fucking stupid fail of a burn.
      setDigitalAssets(event.data.digitalAssets.filter((da) => da.content.json_uri !== "https://brref1.site"))
      worker.terminate()
    }

    worker.onerror = () => {
      worker.terminate()
    }

    worker.postMessage({ collectionId, wallet, ids })
  }

  useEffect(() => {
    getDigitalAssets()
  }, [wallet, collectionId])

  return <Context.Provider value={{ digitalAssets, filtered, loading, getDigitalAssets }}>{children}</Context.Provider>
}

export const useDigitalAssets = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useDigitalAssets must be used in a DigitalAssetsProvider")
  }

  return context
}
