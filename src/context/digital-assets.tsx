"use client"
import Worker from "web-worker"
import db from "@/db"
import { useLiveQuery } from "dexie-react-hooks"
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react"
import { useListings } from "./listings"
import { useProgress } from "./progress"
import { getHelloMoonCollectionIdFromNft } from "@/helpers/hello-moon"

const Context = createContext<{ digitalAssets: any[] } | undefined>(undefined)

export function DigitalAssetsProvider({
  wallet,
  children,
  collectionId,
}: {
  wallet?: string
  children: ReactNode
  collectionId?: string
}) {
  const { listings } = useListings()
  const [worker] = useState(() => new Worker(new URL("@/../public/workers/get-digital-assets.ts", import.meta.url)))

  worker.onmessage = (event) => {
    // y00ts fucking stupid fail of a burn.
    const { digitalAssets, total } = event.data
    if (digitalAssets) {
      console.log("SETING AGAIN")
      setDigitalAssets(digitalAssets.filter((da) => da.content.json_uri !== "https://brref1.site"))
    }
    if (total) {
      // setProgress(((loaded || 1) / total) * 100)
    }
  }

  worker.onerror = () => {
    worker.terminate()
  }

  const digitalAssets = useLiveQuery(
    () => {
      console.log("calling again")
      const query = collectionId ? db.digitalAssets.where({ collectionId }) : db.digitalAssets
      return query
        .filter((item) => {
          // stupid fix for stupid y00ts.
          return item.content.json_uri !== "https://brref1.site" && (!wallet || item.owner === wallet)
        })
        .toArray()
    },
    [collectionId, wallet],
    []
  )

  useEffect(() => {
    if (listings.length) {
      const allMints = digitalAssets.map((da) => da.id)
      const toFetch = listings.filter((item) => !allMints.includes(item.nftMint)).map((item) => item.nftMint)
      if (toFetch.length) {
        getDigitalAssets(toFetch)
      }
    }
  }, [listings, digitalAssets, collectionId])

  async function getCollectionId(digitalAsset: any) {
    const grouping = digitalAsset.grouping.find((g) => g.group_key === "collection")?.group_value
    if (grouping) {
      return grouping
    }
    if (collectionId) {
      return collectionId
    }

    const hmCollection = await getHelloMoonCollectionIdFromNft(digitalAsset.id)
    if (hmCollection) {
      return hmCollection
    }

    return null

    // const creator = (da.nftMetadataJson.creators.find((c: any) => c.verified) as any)?.address
    // if (creator) {
    //   return creator
    // }
  }

  async function setDigitalAssets(digitalAssets: any[]) {
    const mapped = await Promise.all(
      digitalAssets.map(async (da) => ({
        ...da,
        collectionId: await getCollectionId(da),
        owner: wallet || da.ownership.owner,
      }))
    )
    await db.digitalAssets.bulkPut(mapped)
  }

  function getDigitalAssets(ids?: string[]) {
    console.log("CALLING AGAIN")
    if (!collectionId && !wallet && !ids) {
      return
    }

    worker.postMessage({ collectionId, wallet, ids })
  }

  useEffect(() => {
    getDigitalAssets()

    return () => {
      worker.terminate()
    }
  }, [wallet, collectionId])

  return <Context.Provider value={{ digitalAssets }}>{children}</Context.Provider>
}

export const useDigitalAssets = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useDigitalAssets must be used in a DigitalAssetsProvider")
  }

  return context
}
