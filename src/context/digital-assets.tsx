"use client"
import Worker from "web-worker"
import db from "@/db"
import { useLiveQuery } from "dexie-react-hooks"
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react"
import { useProgress } from "./progress"
import { getHelloMoonCollectionIdFromNft } from "@/helpers/hello-moon-server-actions"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { useWallet } from "@solana/wallet-adapter-react"
import { Collection } from "@/types/database"

const Context = createContext<{ digitalAssets: DigitalAsset[]; active: boolean } | undefined>(undefined)

export function DigitalAssetsProvider({
  publicKey,
  children,
  collection,
  ownWallet,
}: {
  publicKey?: string
  children: ReactNode
  collection?: Collection
  ownWallet?: boolean
}) {
  const [active, setActive] = useState(false)
  const [worker, setWorker] = useState<Worker | null>(null)
  const wallet = useWallet()

  const digitalAssets = useLiveQuery(
    () => {
      const query = collection ? db.digitalAssets.where({ collectionId: collection.slug }) : db.digitalAssets
      return query
        .filter((item) => {
          // stupid fix for stupid y00ts.
          if (item.jsonUri === "https://brref1.site") {
            return false
          }
          if (publicKey) {
            return item.owner === publicKey
          }
          if (ownWallet) {
            return item.owner === wallet.publicKey?.toBase58()
          }
          return true
        })
        .toArray()
    },
    [collection, wallet.publicKey, publicKey],
    []
  ).map((item) => new DigitalAsset(item))

  // useEffect(() => {
  //   if (listings.length) {
  //     const allMints = digitalAssets.map((da) => da.id)
  //     const toFetch = listings.filter((item) => !allMints.includes(item.nftId)).map((item) => item.nftId)
  //     if (toFetch.length) {
  //       getDigitalAssets(toFetch)
  //     }
  //   }
  // }, [listings, digitalAssets, collectionId, active])

  // async function getCollectionId(digitalAsset: any) {
  //   const grouping = digitalAsset.grouping.find((g: any) => g.group_key === "collection")?.group_value
  //   if (grouping) {
  //     return grouping
  //   }
  //   if (collection) {
  //     return collection
  //   }

  //   const hmCollection = await getHelloMoonCollectionIdFromNft(digitalAsset.id)
  //   if (hmCollection) {
  //     return hmCollection
  //   }

  //   return null

  //   // const creator = (da.nftMetadataJson.creators.find((c: any) => c.verified) as any)?.address
  //   // if (creator) {
  //   //   return creator
  //   // }
  // }

  async function setDigitalAssets(digitalAssets: any[]) {
    console.log({ digitalAssets })
    // const mapped = await Promise.all(
    //   digitalAssets.map(async (da) => {
    //     // const collectionId = await getCollectionId(da)
    //     return DigitalAsset.solana({
    //       ...da,
    //       collection: collection.id,
    //       owner: publicKey || da.ownership.owner,
    //     })
    //   })
    // )
    // // console.log({ mapped })
    // await db.digitalAssets.bulkPut(mapped)
  }

  function getDigitalAssets(ids?: string[]) {
    if (active) {
      console.log("returning 1")
      return
    }
    if (!collection?.slug && !publicKey && !ids && !wallet.publicKey) {
      console.log("returning 2")
      return
    }
    setActive(true)

    const worker = new Worker(new URL("@/../public/workers/get-digital-assets.ts", import.meta.url))
    setWorker(worker)

    worker.onmessage = (event) => {
      setActive(false)
      const { digitalAssets, total } = event.data
      if (digitalAssets) {
        // y00ts fucking stupid fail of a burn.
        setDigitalAssets(digitalAssets.filter((da: any) => da.jsonUri !== "https://brref1.site"))
      }
      if (total) {
        // setProgress(((loaded || 1) / total) * 100)
      }
    }

    worker.onerror = () => {
      setActive(false)
      worker.terminate()
    }

    worker.postMessage({
      collectionId: collection?.slug,
      publicKey: ownWallet ? wallet.publicKey?.toBase58() : publicKey,
      ids,
    })
  }

  useEffect(() => {
    getDigitalAssets()

    return () => {
      setActive(false)
      if (worker) {
        worker.terminate()
      }
    }
  }, [wallet.publicKey, collection?.slug, publicKey])

  return (
    <Context.Provider
      value={{
        digitalAssets,
        active,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export const useDigitalAssets = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useDigitalAssets must be used in a DigitalAssetsProvider")
  }

  return context
}
