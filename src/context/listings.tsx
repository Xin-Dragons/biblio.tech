"use client"
import { getHelloMoonCollectionId } from "@/helpers/hello-moon"
import { useParams } from "next/navigation"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"

const Context = createContext<{ listings: any[]; fetchListings: Function } | undefined>(undefined)

export function ListingsProvider({ children, collectionId }: { children: ReactNode; collectionId?: string | null }) {
  const [listings, setListings] = useState([])
  const { publicKey } = useParams()

  async function fetchListings() {
    let helloMoonCollectionId
    if (collectionId) {
      helloMoonCollectionId = await getHelloMoonCollectionId(collectionId)
    }

    if (!helloMoonCollectionId && !publicKey) {
      return
    }

    const worker = new Worker(new URL("@/../public/get-listings.worker.ts", import.meta.url))

    worker.onmessage = (event) => {
      setListings(event.data.listings)
      worker.terminate()
    }

    worker.onerror = () => {
      worker.terminate()
    }

    worker.postMessage({ helloMoonCollectionId, publicKey })
  }

  useEffect(() => {
    fetchListings()
  }, [collectionId, publicKey])

  return <Context.Provider value={{ listings, fetchListings }}>{children}</Context.Provider>
}

export const useListings = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useListings must be used in a ListingsProvider")
  }

  return context
}
