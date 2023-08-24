"use client"
import { DB } from "@/db"
import { useLiveQuery } from "dexie-react-hooks"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useFilters } from "./filters"
import { size } from "lodash"
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
  const { selectedFilters } = useFilters()
  const [loading, setLoading] = useState(false)

  const digitalAssets = useLiveQuery(
    () => {
      console.log({ collectionId })
      const query = collectionId ? db.digitalAssets.where({ collectionId }) : db.digitalAssets
      return query.filter((item) => !wallet || item.ownership.owner === wallet).toArray()
    },
    [collectionId, wallet],
    []
  )

  const filtered = digitalAssets.filter((item) => {
    return (
      !size(selectedFilters) ||
      Object.keys(selectedFilters).every((key) => {
        const vals = selectedFilters[key]
        return (
          !vals.length ||
          vals.includes((item.content.metadata.attributes || []).find((att) => att.trait_type === key)?.value)
        )
      })
    )
  })

  async function setDigitalAssets(digitalAssets) {
    console.log({ digitalAssets })
    await db.digitalAssets.bulkPut(
      digitalAssets.map((da) => ({
        ...da,
        collectionId,
      }))
    )
  }

  function getDigitalAssets() {
    if (!collectionId && !wallet) {
      return
    }
    const worker = new Worker(new URL("@/../public/get-digital-assets.worker.ts", import.meta.url))

    worker.onmessage = (event) => {
      setDigitalAssets(event.data.digitalAssets)
      worker.terminate()
    }

    worker.onerror = () => {
      worker.terminate()
    }

    worker.postMessage({ collectionId, wallet })
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
