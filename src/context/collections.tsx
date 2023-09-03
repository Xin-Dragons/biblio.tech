"use client"
import Worker from "web-worker"
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react"
import { useDigitalAssets } from "./digital-assets"
import { orderBy, uniq } from "lodash"
import { useSort } from "./sort"
import { useFilters } from "./filters"

const Context = createContext<{ collections: any[]; filtered: any[] } | undefined>(undefined)

export function CollectionsProvider({ children }: PropsWithChildren) {
  const { type, direction } = useSort()
  const { search } = useFilters()
  const { digitalAssets } = useDigitalAssets()
  const [collections, setCollections] = useState([])
  const [worker] = useState(() => new Worker(new URL("@/../public/workers/get-collections.ts", import.meta.url)))
  const [filtered, setFiltered] = useState([])

  worker.onmessage = (event) => {
    const { collections } = event.data

    setCollections(collections)
  }

  useMemo(() => {
    if (digitalAssets.length) {
      worker.postMessage({ digitalAssets })
    }
  }, [digitalAssets])

  useEffect(() => {
    let filtered = [...collections]

    if (search) {
      const s = search.toLowerCase()

      filtered = filtered.filter((nft) => {
        let name = nft.content.metadata.name || ""
        if (typeof name !== "string") {
          name = `${name}`
        }
        const symbol = nft.content.metadata.symbol || ""
        const description = nft.content.metadata.description || ""

        return (
          nft.id === search ||
          name.toLowerCase().includes(s) ||
          description.toLowerCase().includes(s) ||
          symbol.toLowerCase().includes(s)
        )
      })
    }

    if (type === "name") {
      filtered = orderBy(filtered, (item) => (item.content.metadata.name || "").toLowerCase(), direction)
    }

    if (type === "amount") {
      filtered = orderBy(
        filtered,
        [(item) => item.digitalAssets.length, (item) => (item.content.metadata.name || "").toLowerCase()],
        [direction, "asc"]
      )
    }

    if (type === "value") {
      filtered = orderBy(
        filtered,
        [(item: any) => item.value, (item: any) => item.digitalAssets?.length],
        [direction, "desc"]
      )
    }

    setFiltered(filtered)
  }, [collections, type, direction, search])

  // if (type === "price") {
  //   filtered = orderBy(filtered, (item) => item.listing?.price, direction)
  // }

  return <Context.Provider value={{ collections, filtered }}>{children}</Context.Provider>
}

export const useCollections = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useCollections must be used in a CollectionsProvider")
  }

  return context
}
